import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { User } from './entities/user.entity';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';

@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Req() req: Request): Promise<Omit<User, 'refreshToken'>> {
    const payload = req.user as JwtPayload;
    const user = await this.usersService.findById(payload.sub);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refreshToken: _, ...profile } = user;
    return profile;
  }

  @Patch('fcm-token')
  async updateFcmToken(
    @Req() req: Request,
    @Body() body: UpdateFcmTokenDto,
  ): Promise<void> {
    const payload = req.user as JwtPayload;
    await this.usersService.updateFcmToken(payload.sub, body.fcmToken);
  }
}
