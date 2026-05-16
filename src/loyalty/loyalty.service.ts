import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Coupon, CouponStatus, DiscountType } from './entities/coupon.entity';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
  ) {}

  async getPoints(userId: string): Promise<{ loyaltyPoints: number; currentTier: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return { loyaltyPoints: user.loyaltyPoints, currentTier: user.currentTier };
  }

  async validateCoupon(
    code: string,
    orderTotal: number,
  ): Promise<{ valid: boolean; discountedTotal: number }> {
    const coupon = await this.couponRepository.findOne({
      where: { code, status: CouponStatus.AVAILABLE },
    });
    if (!coupon || coupon.expiresAt < new Date()) {
      return { valid: false, discountedTotal: orderTotal };
    }
    const discount = this.calculateDiscount(coupon, orderTotal);
    return { valid: true, discountedTotal: orderTotal - discount };
  }

  calculateDiscount(coupon: Coupon, orderTotal: number): number {
    if (coupon.discountType === DiscountType.FIXED_AMOUNT) {
      return Math.min(coupon.discountValue, orderTotal);
    }
    const pct = Math.floor((orderTotal * coupon.discountValue) / 100);
    return coupon.maxValue ? Math.min(pct, coupon.maxValue) : pct;
  }

  async getWallet(userId: string): Promise<{
    currentStampCount: number;
    loyaltyPoints: number;
    availableCoupons: Coupon[];
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const availableCoupons = await this.couponRepository.find({
      where: { user: { id: userId }, status: CouponStatus.AVAILABLE },
    });
    return {
      currentStampCount: user.currentStampCount,
      loyaltyPoints: user.loyaltyPoints,
      availableCoupons,
    };
  }
}
