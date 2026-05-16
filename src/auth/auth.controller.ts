import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { Public } from './decorators/public.decorator';
import { AuthService, AuthTokens } from './auth.service';
import { User } from '../users/entities/user.entity';
import { FirebaseLoginDto } from './dto/firebase-login.dto';

/**
 * NOTE: Auth flow deviation from original spec (intentional).
 * Spec specified GET /auth/google + GET /auth/google/callback (OAuth2 redirect).
 * Implementation uses POST /auth/firebase (Firebase ID token verification).
 *
 * Rationale: Android client handles the Google OAuth dance via Firebase SDK.
 * Backend only needs to verify the resulting ID token — redirect flow doesn't apply.
 * Decision made: 2026-05-16. Do not revert to OAuth2 redirect without re-evaluating client flow.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Android sends a Firebase ID token obtained after Google Sign-In.
   * NestJS verifies it via firebase-admin, upserts the user, and issues its own JWTs.
   */
  @Public()
  @Post('firebase')
  async firebaseLogin(@Body() body: FirebaseLoginDto): Promise<AuthTokens> {
    return this.authService.verifyFirebaseAndLogin(body.idToken);
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
