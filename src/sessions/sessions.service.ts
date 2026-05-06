import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { Table } from '../users/entities/table.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
  ) {}

  async createSession(tableId: string): Promise<Session> {
    const table = await this.tableRepository.findOne({ where: { id: tableId } });
    if (!table || !table.isAvailable) {
      throw new BadRequestException('Table is not available');
    }

    const session = this.sessionRepository.create({
      tableId,
      startTime: new Date(),
      isActive: true,
    });

    await this.tableRepository.update(tableId, { isAvailable: false });
    return this.sessionRepository.save(session);
  }
}