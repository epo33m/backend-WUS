import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './entities/coupon.entity';
import { TierConfig } from './entities/tier-config.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Coupon, TierConfig, LoyaltyTransaction])],
    exports: [TypeOrmModule],
})
export class LoyaltyModule {}