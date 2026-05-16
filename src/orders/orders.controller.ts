import { Controller, Get, Post, Delete, Param, Body, Req, Patch, Sse, MessageEvent, UseGuards } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { Request } from 'express';
import { OrdersService } from './orders.service';
import { SseService } from '../sse/sse.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly sseService: SseService,
  ) {}

  @Post()
  async createOrder(@Req() req: Request, @Body() createOrderDto: CreateOrderDto) {
    const payload = req.user as JwtPayload;
    return this.ordersService.createOrder(payload.sub, createOrderDto);
  }

  @Get()
  async getOrders() {
    return this.ordersService.findOrders();
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return this.ordersService.findOrderById(id);
  }

  @Delete(':id/cancel')
  async cancelOrder(@Param('id') id: string) {
    return this.ordersService.cancelOrder(id);
  }

  @Patch(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER')
  async reviewOrder(@Param('id') id: string, @Req() req: Request) {
    const payload = req.user as JwtPayload;
    return this.ordersService.reviewOrder(id, payload.sub);
  }

  @Patch(':id/ready')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER')
  async readyOrder(@Param('id') id: string) {
    return this.ordersService.readyOrder(id);
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER')
  async completeOrder(@Param('id') id: string) {
    return this.ordersService.completeOrder(id);
  }

  @Get('status/:id/stream')
  @Sse()
  stream(@Param('id') id: string): Observable<MessageEvent> {
    return this.sseService.getSubject(id).asObservable().pipe(
      map(snapshot => ({ data: snapshot }) as MessageEvent),
    );
  }
}