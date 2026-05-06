import { Repository } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';
export declare class MenuService {
    private readonly menuItemRepository;
    constructor(menuItemRepository: Repository<MenuItem>);
    findAvailableMenuItems(): Promise<MenuItem[]>;
    updateAvailability(id: string, isAvailable: boolean): Promise<MenuItem>;
}
