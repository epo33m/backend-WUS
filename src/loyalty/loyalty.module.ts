import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './entities/coupon.entity';
import { TierConfig } from './entities/tier-config.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController } from './loyalty.controller';
import { DatabaseSeederService } from './database-seeder.service';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Coupon, TierConfig, LoyaltyTransaction, User])],
  controllers: [LoyaltyController],
  providers: [LoyaltyService, DatabaseSeederService],
  exports: [TypeOrmModule, LoyaltyService],
})
export class LoyaltyModule {}