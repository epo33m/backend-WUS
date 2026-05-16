import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @Public()
  async getAvailableMenu() {
    return this.menuService.findAvailableMenuItems();
  }

  @Patch(':id/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER')
  async updateAvailability(
    @Param('id') id: string,
    @Body() body: { isAvailable: boolean },
  ) {
    return this.menuService.updateAvailability(id, body.isAvailable);
  }
}