import type { Request } from 'express';
import { AuthService, AuthTokens } from './auth.service';
import { FirebaseLoginDto } from './dto/firebase-login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    firebaseLogin(body: FirebaseLoginDto): Promise<AuthTokens>;
    refresh(req: Request): Promise<AuthTokens>;
    logout(req: Request): Promise<{
        message: string;
    }>;
}
