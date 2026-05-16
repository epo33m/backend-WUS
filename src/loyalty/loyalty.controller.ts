import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { LoyaltyService } from './loyalty.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Public } from '../auth/decorators/public.decorator';

@Controller()
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('loyalty/points')
  async getPoints(@Req() req: Request) {
    const payload = req.user as JwtPayload;
    return this.loyaltyService.getPoints(payload.sub);
  }

  @Post('coupons/validate')
  @Public()
  async validateCoupon(@Body() body: ValidateCouponDto) {
    return this.loyaltyService.validateCoupon(body.code, body.orderTotal);
  }

  @Get('wallet')
  async getWallet(@Req() req: Request) {
    const payload = req.user as JwtPayload;
    return this.loyaltyService.getWallet(payload.sub);
  }
}
