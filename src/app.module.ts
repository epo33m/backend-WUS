import { Module } from '@nestjs/common';
// import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { User } from './users/entities/user.entity';
import { Table } from './users/entities/table.entity';
import { MenuItem } from './menu/entities/menu-item.entity';
import { Session } from './sessions/entities/session.entity';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { UsersModule } from './users/users.module';

import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';
import { SessionsModule } from './sessions/sessions.module';
import { OrdersModule } from './orders/orders.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RealtimeModule } from './realtime/realtime.module';
import { FirebaseAdminModule } from './firebase/firebase.module';
import { NotificationsModule } from './notifications/notifications.module';

import { LoyaltyModule } from './loyalty/loyalty.module';
// import { AuthModule } from './auth/auth.module';
// import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
// import { RealtimeModule } from './realtime/realtime.module';
// import { FirebaseAdminModule } from './firebase/firebase.module';
// import { NotificationsModule } from './notifications/notifications.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),

        entities: [User, Table, MenuItem, Session, Order, OrderItem],

        autoLoadEntities: true,

        synchronize: config.get<string>('NODE_ENV') !== 'production',
        ssl:
          config.get<string>('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
    UsersModule,
    // AuthModule,
    // RealtimeModule,
    // FirebaseAdminModule,
    // NotificationsModule,
    LoyaltyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    //{
      // provide: APP_GUARD,
      // useClass: JwtAuthGuard,},
  ],
})
export class AppModule {}
