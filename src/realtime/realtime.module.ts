import { Module } from '@nestjs/common';
import { SseService } from '../sse/sse.service';
import { CashierGateway } from '../gateways/cashier.gateway';
import { FcmService } from '../notifications/fcm.service';
import { RealtimeEventListener } from './realtime-event.listener';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [SseService, CashierGateway, FcmService, RealtimeEventListener],
  exports: [SseService, CashierGateway, FcmService],
})
export class RealtimeModule {}
