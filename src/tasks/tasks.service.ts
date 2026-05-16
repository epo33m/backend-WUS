import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Coupon, CouponStatus } from '../loyalty/entities/coupon.entity';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /** Every minute: release stale REVIEWING locks (lockedUntil < NOW) → reset to SUBMITTED */
  @Cron('* * * * *')
  async releaseStaleReviewing(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const staleOrders = await queryRunner.manager
        .createQueryBuilder(Order, 'order')
        .setLock('pessimistic_write', undefined, ['SKIP LOCKED'])
        .where('order.status = :status', { status: OrderStatus.REVIEWING })
        .andWhere('order.lockedUntil < :now', { now: new Date() })
        .getMany();

      for (const order of staleOrders) {
        order.status = OrderStatus.SUBMITTED;
        order.lockedUntil = null;
        await queryRunner.manager.save(Order, order);
      }
      if (staleOrders.length > 0) {
        this.logger.log(`Released ${staleOrders.length} stale REVIEWING order(s) back to SUBMITTED`);
      }
      await queryRunner.commitTransaction();
    } catch (err) {
      this.logger.error('releaseStaleReviewing failed', err);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  /** Every 5 minutes: expire SUBMITTED orders older than 30 min → release their coupons */
  @Cron('*/5 * * * *')
  async expireOldSubmitted(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000);
      const oldOrders = await queryRunner.manager
        .createQueryBuilder(Order, 'order')
        .setLock('pessimistic_write', undefined, ['SKIP LOCKED'])
        .leftJoinAndSelect('order.coupon', 'coupon')
        .where('order.status = :status', { status: OrderStatus.SUBMITTED })
        .andWhere('order.createdAt < :cutoff', { cutoff })
        .getMany();

      for (const order of oldOrders) {
        order.status = OrderStatus.EXPIRED;
        if (order.coupon && order.coupon.status === CouponStatus.RESERVED) {
          order.coupon.status = CouponStatus.AVAILABLE;
          order.coupon.reservedByIdempotencyKey = null as unknown as string;
          await queryRunner.manager.save(Coupon, order.coupon);
        }
        await queryRunner.manager.save(Order, order);
      }
      if (oldOrders.length > 0) {
        this.logger.log(`Expired ${oldOrders.length} stale SUBMITTED order(s)`);
      }
      await queryRunner.commitTransaction();
    } catch (err) {
      this.logger.error('expireOldSubmitted failed', err);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
}
