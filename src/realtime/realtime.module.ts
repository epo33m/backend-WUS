import { Module } from '@nestjs/common';
import { SseService } from '../sse/sse.service';
import { CashierGateway } from '../gateways/cashier.gateway';
import { RealtimeEventListener } from './realtime-event.listener';
// import { AuthModule } from '../auth/auth.module';

@Module({
  // imports: [AuthModule],
  providers: [SseService, CashierGateway, RealtimeEventListener],
  exports: [SseService, CashierGateway],
})
export class RealtimeModule {}
