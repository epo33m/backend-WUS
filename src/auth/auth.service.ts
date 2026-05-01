import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

interface GoogleProfile {
  googleId: string;
  email: string;
  displayName: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

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
}
