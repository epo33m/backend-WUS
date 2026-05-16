import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Session } from '../sessions/entities/session.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Session, MenuItem])],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}