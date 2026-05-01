import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { Public } from './decorators/public.decorator';
import { AuthService, AuthTokens } from './auth.service';
import { User } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin(): void {
    // Passport redirects to Google — no body needed
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request): Promise<AuthTokens> {
    return this.authService.issueTokens(req.user as User);
  }

  @Public()
  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  async refresh(@Req() req: Request): Promise<AuthTokens> {
    return this.authService.refreshTokens(req.user as User);
  }

  @Post('logout')
  async logout(@Req() req: Request): Promise<{ message: string }> {
    const user = req.user as User;
    await this.authService.logout(user.id);
    return { message: 'Logged out' };
  }
}
