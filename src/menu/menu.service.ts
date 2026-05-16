import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
  ) {}

  async findAvailableMenuItems(): Promise<MenuItem[]> {
    return this.menuItemRepository.find({
      where: { isAvailable: true },
    });
  }

  async updateAvailability(id: string, isAvailable: boolean): Promise<MenuItem> {
    await this.menuItemRepository.update(id, { isAvailable });
    const updatedItem = await this.menuItemRepository.findOne({ where: { id } });
    if (!updatedItem) {
      throw new Error('MenuItem not found');
    }
    return updatedItem;
  }
}