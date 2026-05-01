import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SseService, OrderSnapshot } from '../sse/sse.service';
import { CashierGateway } from '../gateways/cashier.gateway';

interface OrderEvent {
  orderId: string;
  userId?: string;
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
  ) {}

  @OnEvent('order.submitted')
  handleOrderSubmitted(event: OrderEvent): void {
    this.cashierGateway.emitNewOrder({ orderId: event.orderId, ...event.order });
  }

  @OnEvent('order.confirmed')
  handleOrderConfirmed(event: OrderEvent): void {
    const snapshot: OrderSnapshot = {
      type: 'ORDER_CONFIRMED',
      orderId: event.orderId,
      status: 'CONFIRMED',
      currentStampCount: event.currentStampCount,
      loyaltyPoints: event.loyaltyPoints,
    };
    this.sseService.push(event.orderId, snapshot);
    this.cashierGateway.emitOrderUpdated({ orderId: event.orderId, status: 'CONFIRMED' });
  }

  @OnEvent('order.ready')
  handleOrderReady(event: OrderEvent): void {
    const snapshot: OrderSnapshot = {
      type: 'ORDER_READY',
      orderId: event.orderId,
      status: 'READY',
      currentStampCount: event.currentStampCount,
      loyaltyPoints: event.loyaltyPoints,
    };
    this.sseService.push(event.orderId, snapshot);
    this.cashierGateway.emitOrderUpdated({ orderId: event.orderId, status: 'READY' });
  }

  @OnEvent('reward.issued')
  handleRewardIssued(event: OrderEvent): void {
    const snapshot: OrderSnapshot = {
      type: 'REWARD_ISSUED',
      orderId: event.orderId,
      status: event.status ?? '',
      loyaltyPoints: event.loyaltyPoints,
    };
    this.sseService.push(event.orderId, snapshot);
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
