import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    createOrder(createOrderDto: CreateOrderDto): Promise<import("./entities/order.entity").Order>;
    getOrder(id: string): Promise<import("./entities/order.entity").Order>;
    cancelOrder(id: string): Promise<import("./entities/order.entity").Order>;
    getOrders(): Promise<import("./entities/order.entity").Order[]>;
}
