import { MenuService } from './menu.service';
export declare class MenuController {
    private readonly menuService;
    constructor(menuService: MenuService);
    getAvailableMenu(): Promise<import("./entities/menu-item.entity").MenuItem[]>;
    updateAvailability(id: string, body: {
        isAvailable: boolean;
    }): Promise<import("./entities/menu-item.entity").MenuItem>;
}
