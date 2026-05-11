import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './entities/coupon.entity';
import { TierConfig } from './entities/tier-config.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Coupon, TierConfig])],
    exports: [TypeOrmModule],
})
export class LoyaltyModule {}