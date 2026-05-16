import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as admin from 'firebase-admin';
import { User } from '../users/entities/user.entity';
import { FIREBASE_APP } from '../firebase/firebase.module';

interface GoogleProfile {
  googleId: string;
  email: string;
  displayName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject(FIREBASE_APP) private readonly firebaseApp: admin.app.App,
  ) {}

  async verifyFirebaseAndLogin(idToken: string): Promise<AuthTokens> {
    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await this.firebaseApp.auth().verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid Firebase ID token');
    }
    const user = await this.upsertGoogleUser({
      googleId: decoded.uid,
      email: decoded.email ?? '',
      displayName: (decoded.name as string | undefined) ?? decoded.email ?? decoded.uid,
    });
    return this.issueTokens(user);
  }

  async upsertGoogleUser(profile: GoogleProfile): Promise<User> {
    let user = await this.usersRepository.findOne({
      where: { googleId: profile.googleId },
    });

    if (!user) {
      user = this.usersRepository.create({
        googleId: profile.googleId,
        email: profile.email,
        displayName: profile.displayName,
      });
    } else {
      user.email = profile.email;
      user.displayName = profile.displayName;
    }

    return this.usersRepository.save(user);
  }

  async issueTokens(user: User): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '30d',
    });

    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.update(user.id, { refreshToken: hashed });

    return { accessToken, refreshToken };
  }

  async refreshTokens(user: User): Promise<AuthTokens> {
    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { refreshToken: null });
  }
}
