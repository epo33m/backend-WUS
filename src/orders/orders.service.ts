import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Session } from '../sessions/entities/session.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';

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
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check idempotency
      const existingOrder = await queryRunner.manager.findOne(Order, {
        where: { idempotencyKey: createOrderDto.idempotencyKey },
      });
      if (existingOrder) {
        throw new ConflictException('Order already exists with this idempotency key');
      }

      // Validate session
      const session = await queryRunner.manager.findOne(Session, {
        where: { id: createOrderDto.sessionId },
      });
      if (!session || !session.isActive) {
        throw new BadRequestException('Invalid or inactive session');
      }

      // Calculate total amount
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];
      for (const item of createOrderDto.items) {
        const menuItem = await queryRunner.manager.findOne(MenuItem, {
          where: { id: item.menuItemId, isAvailable: true },
        });
        if (!menuItem) {
          throw new BadRequestException(`Menu item ${item.menuItemId} not available`);
        }
        const orderItem = queryRunner.manager.create(OrderItem, {
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
        orderItems.push(orderItem);
        totalAmount += item.quantity * item.unitPrice;
      }

      // Reserve coupon if provided (placeholder)
      if (createOrderDto.couponCode) {
        // await this.reserveCoupon(queryRunner, createOrderDto.couponCode);
      }

      // Create order
      const order = queryRunner.manager.create(Order, {
        idempotencyKey: createOrderDto.idempotencyKey,
        sessionId: createOrderDto.sessionId,
        status: OrderStatus.PENDING,
        totalAmount,
      });
      const savedOrder = await queryRunner.manager.save(Order, order);

      // Save order items
      for (const item of orderItems) {
        item.orderId = savedOrder.id;
        await queryRunner.manager.save(OrderItem, item);
      }

      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error.code === '23505') { // Unique constraint violation
        throw new ConflictException('Idempotency key conflict');
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOrderById(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.menuItem'],
    });
    if (!order) {
      throw new BadRequestException('Order not found');
    }
    return order;
  }

  async cancelOrder(id: string): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, { where: { id } });
      if (!order) {
        throw new BadRequestException('Order not found');
      }
      if (order.status === OrderStatus.PAID) {
        throw new BadRequestException('Cannot cancel a paid order');
      }

      order.status = OrderStatus.CANCELLED;
      const updatedOrder = await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();
      return updatedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOrders(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: ['session', 'session.table'],
      order: { createdAt: 'DESC' },
      take: 50, // Limit to 50 for dashboard
    });
  }

  // Placeholder for reserveCoupon
  private async reserveCoupon(queryRunner: QueryRunner, couponCode: string): Promise<void> {
    // Implement coupon reservation logic here
  }
}