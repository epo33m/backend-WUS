import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import { User } from '../users/entities/user.entity';
interface GoogleProfile {
    googleId: string;
    email: string;
    displayName: string;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
export declare class AuthService {
    private readonly usersRepository;
    private readonly jwtService;
    private readonly config;
    private readonly firebaseApp;
    constructor(usersRepository: Repository<User>, jwtService: JwtService, config: ConfigService, firebaseApp: admin.app.App);
    verifyFirebaseAndLogin(idToken: string): Promise<AuthTokens>;
    upsertGoogleUser(profile: GoogleProfile): Promise<User>;
    issueTokens(user: User): Promise<AuthTokens>;
    refreshTokens(user: User): Promise<AuthTokens>;
    logout(userId: string): Promise<void>;
}
export {};
