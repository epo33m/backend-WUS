import { Controller, Post, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CashierService } from './cashier.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('orders')
export class CashierController {
  constructor(private readonly cashierService: CashierService) {}

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER')
  async confirmOrder(@Param('id') id: string, @Req() req: Request) {
    const payload = req.user as JwtPayload;
    return this.cashierService.confirmOrder(id, payload.sub);
  }
}
