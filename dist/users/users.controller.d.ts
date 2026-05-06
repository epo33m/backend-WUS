import type { Request } from 'express';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(req: Request): Promise<Omit<User, 'refreshToken'>>;
    updateFcmToken(req: Request, body: UpdateFcmTokenDto): Promise<void>;
}
