import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
export declare class SessionsController {
    private readonly sessionsService;
    constructor(sessionsService: SessionsService);
    createSession(createSessionDto: CreateSessionDto): Promise<import("./entities/session.entity").Session>;
}
