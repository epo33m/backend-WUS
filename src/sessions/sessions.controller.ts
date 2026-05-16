import { Controller, Post, Req, Body } from '@nestjs/common';
import type { Request } from 'express';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async createSession(@Req() req: Request, @Body() createSessionDto: CreateSessionDto) {
    const payload = req.user as JwtPayload;
    return this.sessionsService.createOrResumeSession(payload.sub, createSessionDto.tableId);
  }
}