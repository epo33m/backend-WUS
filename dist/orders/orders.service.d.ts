import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Session } from '../sessions/entities/session.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
export declare class OrdersService {
    private readonly orderRepository;
    private readonly orderItemRepository;
    private readonly sessionRepository;
    private readonly menuItemRepository;
    private readonly dataSource;
    constructor(orderRepository: Repository<Order>, orderItemRepository: Repository<OrderItem>, sessionRepository: Repository<Session>, menuItemRepository: Repository<MenuItem>, dataSource: DataSource);
    createOrder(createOrderDto: CreateOrderDto): Promise<Order>;
    findOrderById(id: string): Promise<Order>;
    cancelOrder(id: string): Promise<Order>;
    findOrders(): Promise<Order[]>;
    private reserveCoupon;
}
