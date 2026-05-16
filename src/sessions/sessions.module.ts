import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { Session } from './entities/session.entity';
import { Table } from '../users/entities/table.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Session, Table])],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}