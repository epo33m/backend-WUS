import { Injectable, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Session, SessionStatus } from '../sessions/entities/session.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { Coupon, CouponStatus, DiscountType } from '../loyalty/entities/coupon.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { SseService } from '../sse/sse.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly sseService: SseService,
  ) {}

  async createOrder(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Idempotency: return existing order for same key without error
      const existing = await queryRunner.manager.findOne(Order, {
        where: { idempotencyKey: createOrderDto.idempotencyKey },
      });
      if (existing) {
        await queryRunner.rollbackTransaction();
        return existing;
      }

      // Validate session belongs to this user and is active
      const session = await queryRunner.manager.findOne(Session, {
        where: { id: createOrderDto.sessionId, userId, status: SessionStatus.ACTIVE },
        relations: ['table'],
      });
      if (!session) {
        throw new BadRequestException('Invalid or inactive session');
      }

      // Build order items, snapshot prices from menu (never trust client price)
      let subtotal = 0;
      const itemsToCreate: Partial<OrderItem>[] = [];
      for (const item of createOrderDto.items) {
        const menuItem = await queryRunner.manager.findOne(MenuItem, {
          where: { id: item.menuItemId, isAvailable: true },
        });
        if (!menuItem) {
          throw new BadRequestException(`Menu item ${item.menuItemId} not available`);
        }
        subtotal += item.quantity * menuItem.price;
        itemsToCreate.push({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: menuItem.price,
        });
      }

      // Reserve coupon if provided — pessimistic write lock, idempotent on same key, 409 on collision
      let couponId: number | null = null;
      let discountAmount = 0;
      if (createOrderDto.couponCode) {
        const coupon = await queryRunner.manager
          .createQueryBuilder(Coupon, 'coupon')
          .setLock('pessimistic_write')
          .where('coupon.code = :code', { code: createOrderDto.couponCode })
          .getOne();

        if (!coupon || coupon.expiresAt < new Date()) {
          throw new BadRequestException('Coupon not found or expired');
        }
        if (coupon.status === CouponStatus.RESERVED) {
          if (coupon.reservedByIdempotencyKey !== createOrderDto.idempotencyKey) {
            throw new ConflictException('Coupon is already reserved by another order');
          }
          // Idempotent re-assert: same key already holds this coupon
        } else if (coupon.status !== CouponStatus.AVAILABLE) {
          throw new BadRequestException('Coupon is not available');
        } else {
          coupon.status = CouponStatus.RESERVED;
          coupon.reservedByIdempotencyKey = createOrderDto.idempotencyKey;
          await queryRunner.manager.save(Coupon, coupon);
        }
        couponId = coupon.id;
        discountAmount = this.calculateDiscount(coupon, subtotal);
      }

      const order = queryRunner.manager.create(Order, {
        idempotencyKey: createOrderDto.idempotencyKey,
        userId,
        sessionId: session.id,
        tableNumber: session.table?.tableNumber ?? null,
        status: OrderStatus.SUBMITTED,
        couponId,
        subtotal,
        discountAmount,
        totalAmount: subtotal - discountAmount,
        lockedUntil: null,
        cashierId: null,
      });
      const savedOrder = await queryRunner.manager.save(Order, order);

      for (const item of itemsToCreate) {
        await queryRunner.manager.save(OrderItem, { ...item, orderId: savedOrder.id });
      }

      await queryRunner.commitTransaction();

      this.eventEmitter.emit('order.submitted', {
        orderId: savedOrder.id,
        order: { id: savedOrder.id, tableNumber: savedOrder.tableNumber, totalAmount: savedOrder.totalAmount },
      });

      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if ((error as NodeJS.ErrnoException & { code?: string }).code === '23505') {
        const existing = await this.orderRepository.findOne({
          where: { idempotencyKey: createOrderDto.idempotencyKey },
        });
        if (existing) return existing;
        throw new ConflictException('Idempotency key conflict');
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async reviewOrder(orderId: string, cashierId: string): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new BadRequestException('Order not found');
      if (order.status !== OrderStatus.SUBMITTED) {
        throw new BadRequestException(`Cannot review order in status ${order.status}`);
      }
      order.status = OrderStatus.REVIEWING;
      order.lockedUntil = new Date(Date.now() + 2 * 60 * 1000);
      order.cashierId = cashierId;
      const saved = await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();
      return saved;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async readyOrder(orderId: string): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new BadRequestException('Order not found');
      if (order.status !== OrderStatus.CONFIRMED) {
        throw new BadRequestException(`Cannot mark ready: order is in status ${order.status}`);
      }
      order.status = OrderStatus.READY;
      const saved = await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();
      this.eventEmitter.emit('order.ready', { orderId: saved.id, status: 'READY' });
      return saved;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async completeOrder(orderId: string): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new BadRequestException('Order not found');
      if (order.status !== OrderStatus.READY) {
        throw new BadRequestException(`Cannot complete: order is in status ${order.status}`);
      }
      order.status = OrderStatus.COMPLETED;
      const saved = await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();
      this.sseService.complete(orderId);
      return saved;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelOrder(orderId: string): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
        relations: ['coupon'],
      });
      if (!order) throw new BadRequestException('Order not found');
      if (order.status === OrderStatus.REVIEWING) {
        throw new ForbiddenException('Cannot cancel order while it is being reviewed');
      }
      if (order.status !== OrderStatus.SUBMITTED) {
        throw new BadRequestException(`Cannot cancel order in status ${order.status}`);
      }
      order.status = OrderStatus.CANCELLED;
      if (order.coupon && order.coupon.status === CouponStatus.RESERVED) {
        order.coupon.status = CouponStatus.AVAILABLE;
        order.coupon.reservedByIdempotencyKey = null as unknown as string;
        await queryRunner.manager.save(Coupon, order.coupon);
      }
      const saved = await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();
      this.sseService.complete(saved.id);
      this.eventEmitter.emit('order.cancelled', { orderId: saved.id });
      return saved;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async findOrderById(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.menuItem', 'session', 'session.table'],
    });
    if (!order) throw new BadRequestException('Order not found');
    return order;
  }

  async findOrders(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: ['session', 'session.table', 'items'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  private calculateDiscount(coupon: Coupon, orderTotal: number): number {
    if (coupon.discountType === DiscountType.FIXED_AMOUNT) {
      return Math.min(coupon.discountValue, orderTotal);
    }
    const pct = Math.floor((orderTotal * coupon.discountValue) / 100);
    return coupon.maxValue ? Math.min(pct, coupon.maxValue) : pct;
  }
}