import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { Table } from '../users/entities/table.entity';
export declare class SessionsService {
    private readonly sessionRepository;
    private readonly tableRepository;
    constructor(sessionRepository: Repository<Session>, tableRepository: Repository<Table>);
    createSession(tableId: string): Promise<Session>;
}
