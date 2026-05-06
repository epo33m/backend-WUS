import { Order } from './order.entity';
import { MenuItem } from '../../menu/entities/menu-item.entity';
export declare class OrderItem {
    id: string;
    quantity: number;
    unitPrice: number;
    order: Order;
    orderId: string;
    menuItem: MenuItem;
    menuItemId: string;
    createdAt: Date;
    updatedAt: Date;
}
