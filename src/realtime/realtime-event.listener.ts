import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SseService, OrderSnapshot } from '../sse/sse.service';
import { CashierGateway } from '../gateways/cashier.gateway';
import { FcmService } from '../notifications/fcm.service';

interface OrderEvent {
  orderId: string;
  userId?: string;
  fcmToken?: string;
  status?: string;
  currentStampCount?: number;
  loyaltyPoints?: number;
  order?: object;
}

@Injectable()
export class RealtimeEventListener {
  constructor(
    private readonly sseService: SseService,
    private readonly cashierGateway: CashierGateway,
    private readonly fcmService: FcmService,
  ) {}

  @OnEvent('order.submitted')
  handleOrderSubmitted(event: OrderEvent): void {
    this.cashierGateway.emitNewOrder({ orderId: event.orderId, ...event.order });
  }

  @OnEvent('order.confirmed')
  async handleOrderConfirmed(event: OrderEvent): Promise<void> {
    const snapshot: OrderSnapshot = {
      type: 'ORDER_CONFIRMED',
      orderId: event.orderId,
      status: 'CONFIRMED',
      currentStampCount: event.currentStampCount,
      loyaltyPoints: event.loyaltyPoints,
    };
    this.sseService.push(event.orderId, snapshot);
    this.cashierGateway.emitOrderUpdated({ orderId: event.orderId, status: 'CONFIRMED' });

    if (event.fcmToken) {
      await this.fcmService.sendDataNotification(event.fcmToken, {
        type: 'ORDER_CONFIRMED',
        orderId: event.orderId,
      });
    }
  }

  @OnEvent('order.ready')
  async handleOrderReady(event: OrderEvent): Promise<void> {
    const snapshot: OrderSnapshot = {
      type: 'ORDER_READY',
      orderId: event.orderId,
      status: 'READY',
      currentStampCount: event.currentStampCount,
      loyaltyPoints: event.loyaltyPoints,
    };
    this.sseService.push(event.orderId, snapshot);
    this.cashierGateway.emitOrderUpdated({ orderId: event.orderId, status: 'READY' });

    if (event.fcmToken) {
      await this.fcmService.sendDataNotification(event.fcmToken, {
        type: 'ORDER_READY',
        orderId: event.orderId,
      });
    }
  }

  @OnEvent('reward.issued')
  async handleRewardIssued(event: OrderEvent): Promise<void> {
    const snapshot: OrderSnapshot = {
      type: 'REWARD_ISSUED',
      orderId: event.orderId,
      status: event.status ?? '',
      loyaltyPoints: event.loyaltyPoints,
    };
    this.sseService.push(event.orderId, snapshot);

    if (event.fcmToken) {
      await this.fcmService.sendDataNotification(event.fcmToken, {
        type: 'REWARD_ISSUED',
        orderId: event.orderId,
      });
    }
  }

  @OnEvent('user.tier_upgraded')
  handleTierUpgraded(event: OrderEvent): void {
    const snapshot: OrderSnapshot = {
      type: 'TIER_UPGRADED',
      orderId: event.orderId,
      status: event.status ?? '',
    };
    this.sseService.push(event.orderId, snapshot);
  }
}
