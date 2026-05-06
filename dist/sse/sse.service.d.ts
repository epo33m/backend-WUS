import { Subject } from 'rxjs';
export interface OrderSnapshot {
    type: string;
    orderId: string;
    status: string;
    currentStampCount?: number;
    loyaltyPoints?: number;
}
export declare class SseService {
    private readonly subjects;
    getSubject(orderId: string): Subject<OrderSnapshot>;
    push(orderId: string, snapshot: OrderSnapshot): void;
    complete(orderId: string): void;
}
