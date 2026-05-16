import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Coupon, CouponSource, CouponStatus, DiscountType, CouponAppliesTo } from '../loyalty/entities/coupon.entity';
import { TierConfig } from '../loyalty/entities/tier-config.entity';
import { LoyaltyTransaction, LoyaltyTransactionReason } from '../loyalty/entities/loyalty-transaction.entity';
import { UserTier } from '../users/enums/user-tier.enum';

const TIER_MAP: Record<string, UserTier> = {
  BRONZE: UserTier.BRONZE,
  SILVER: UserTier.SILVER,
  GOLD: UserTier.GOLD,
};

@Injectable()
export class CashierService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async confirmOrder(orderId: string, cashierId: string): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Pessimistic write lock on Order
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
        relations: ['coupon'],
      });
      if (!order) throw new BadRequestException('Order not found');
      if (![OrderStatus.SUBMITTED, OrderStatus.REVIEWING].includes(order.status)) {
        throw new BadRequestException(`Order is in invalid state: ${order.status}`);
      }

      // 2. Pessimistic write lock on User
      const user = await queryRunner.manager.findOne(User, {
        where: { id: order.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new BadRequestException('User not found');

      // 3. Lock and burn coupon if attached
      if (order.couponId !== null) {
        const coupon = await queryRunner.manager.findOne(Coupon, {
          where: { id: order.couponId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!coupon || coupon.status !== CouponStatus.RESERVED) {
          throw new ConflictException('Coupon is no longer valid');
        }
        if (coupon.reservedByIdempotencyKey !== order.idempotencyKey) {
          throw new ConflictException('Coupon reserved by a different order');
        }
        coupon.status = CouponStatus.USED;
        await queryRunner.manager.save(Coupon, coupon);
      }

      // 4. Confirm order
      order.status = OrderStatus.CONFIRMED;
      order.cashierId = cashierId;

      // 5. Points and stamp logic
      user.purchaseCount += 1;
      user.currentStampCount = user.purchaseCount % 10;
      const pointsEarned = Math.floor(order.totalAmount / 1000);
      user.loyaltyPoints += pointsEarned;
      user.lifetimePoints += pointsEarned;

      // 6. Tier upgrade: query TierConfig sorted by threshold DESC
      const tierConfigs = await queryRunner.manager.find(TierConfig, {
        order: { threshold: 'DESC' },
      });
      const prevTier = user.currentTier;
      const matchingTier = tierConfigs.find(t => user.lifetimePoints >= t.threshold);
      if (matchingTier) {
        user.currentTier = TIER_MAP[matchingTier.tierName] ?? user.currentTier;
      }

      await queryRunner.manager.save(User, user);
      const savedOrder = await queryRunner.manager.save(Order, order);

      // 7. Append LoyaltyTransaction row (INSERT ONLY)
      const tx = queryRunner.manager.create(LoyaltyTransaction, {
        userId: user.id,
        orderId: order.id,
        delta: pointsEarned,
        reason: LoyaltyTransactionReason.PURCHASE,
      });
      await queryRunner.manager.save(LoyaltyTransaction, tx);

      // 8. Auto-issue milestone coupon on 10th stamp
      let milestoneCoupon: Coupon | null = null;
      if (user.currentStampCount === 0) {
        milestoneCoupon = await this.issueMilestoneCoupon(queryRunner, user.id);
      }

      // 9. Commit — emit events post-commit only
      await queryRunner.commitTransaction();

      this.eventEmitter.emit('order.confirmed', {
        orderId: savedOrder.id,
        userId: user.id,
        status: 'CONFIRMED',
        currentStampCount: user.currentStampCount,
        loyaltyPoints: user.loyaltyPoints,
      });

      if (user.currentTier !== prevTier) {
        this.eventEmitter.emit('user.tier_upgraded', {
          orderId: savedOrder.id,
          userId: user.id,
          status: user.currentTier,
        });
      }

      if (milestoneCoupon) {
        this.eventEmitter.emit('reward.issued', {
          orderId: savedOrder.id,
          userId: user.id,
          status: 'CONFIRMED',
          loyaltyPoints: user.loyaltyPoints,
        });
      }

      return savedOrder;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  private async issueMilestoneCoupon(
    queryRunner: ReturnType<typeof this.dataSource.createQueryRunner>,
    userId: string,
  ): Promise<Coupon> {
    const code = this.generateCouponCode();
    const coupon = queryRunner.manager.create(Coupon, {
      user: { id: userId },
      code,
      source: CouponSource.MILESTONE_AUTO,
      status: CouponStatus.AVAILABLE,
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 10000,
      maxValue: null as unknown as number,
      reservedByIdempotencyKey: null as unknown as string,
      appliesTo: CouponAppliesTo.ORDER,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    return queryRunner.manager.save(Coupon, coupon);
  }

  private generateCouponCode(): string {
    // Excludes ambiguous characters: O, 0, I, 1, S, 5
    // ~887 million combinations. At volume, wrap the caller in a retry loop catching Postgres error code 23505.
    const charset = 'ABCDEFGHJKLMNPQRTUVWXYZ23467899';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += charset[Math.floor(Math.random() * charset.length)];
    }
    return code;
  }
}
