import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  @Post()
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(
      createOrderDto,
    );
  }

  @Get(':id')
  async getOrder(
    @Param('id') id: string,
  ) {
    return this.ordersService.findOrderById(id);
  }

  @Delete(':id/cancel')
  async cancelOrder(
    @Param('id') id: string,
  ) {
    return this.ordersService.cancelOrder(id);
  }

  @Get()
  async getOrders() {
    return this.ordersService.findOrders();
  }

  @Patch(':id/review')
  @Roles('CASHIER')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  markReviewing(
    @Param('id') id: string,
  ) {
    return this.ordersService.markReviewing(id);
  }
}