import { SseService } from '../sse/sse.service';
import { CashierGateway } from '../gateways/cashier.gateway';
interface OrderEvent {
    orderId: string;
    userId?: string;
    status?: string;
    currentStampCount?: number;
    loyaltyPoints?: number;
    order?: object;
}
export declare class RealtimeEventListener {
    private readonly sseService;
    private readonly cashierGateway;
    constructor(sseService: SseService, cashierGateway: CashierGateway);
    handleOrderSubmitted(event: OrderEvent): void;
    handleOrderConfirmed(event: OrderEvent): void;
    handleOrderReady(event: OrderEvent): void;
    handleRewardIssued(event: OrderEvent): void;
    handleTierUpgraded(event: OrderEvent): void;
}
export {};
