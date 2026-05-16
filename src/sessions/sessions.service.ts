import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, SessionStatus } from './entities/session.entity';
import { Table } from '../users/entities/table.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
  ) {}

  async createOrResumeSession(userId: string, tableId: string): Promise<Session> {
    const table = await this.tableRepository.findOne({ where: { id: tableId } });
    if (!table) {
      throw new BadRequestException('Table not found');
    }

    // Resume existing active session for this user+table
    const existing = await this.sessionRepository.findOne({
      where: { userId, tableId, status: SessionStatus.ACTIVE },
      relations: ['table'],
    });
    if (existing) return existing;

    const session = this.sessionRepository.create({
      userId,
      tableId,
      status: SessionStatus.ACTIVE,
    });
    return this.sessionRepository.save(session);
  }
}