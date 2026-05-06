import { Session } from '../../sessions/entities/session.entity';
export declare enum OrderStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    CANCELLED = "CANCELLED"
}
export declare class Order {
    id: string;
    status: OrderStatus;
    totalAmount: number;
    idempotencyKey: string;
    session: Session;
    sessionId: string;
    createdAt: Date;
    updatedAt: Date;
}
