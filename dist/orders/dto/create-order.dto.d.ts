declare class OrderItemDto {
    menuItemId: string;
    quantity: number;
    unitPrice: number;
}
export declare class CreateOrderDto {
    idempotencyKey: string;
    sessionId: string;
    items: OrderItemDto[];
    couponCode?: string;
}
export {};
