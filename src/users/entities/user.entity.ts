import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserTier } from '../enums/user-tier.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  googleId: string;

  @Column({ unique: true })
  email: string;

  @Column()
  displayName: string;

  @Column({ nullable: true, type: 'varchar' })
  fcmToken: string | null;

  @Column({ default: 0 })
  loyaltyPoints: number;

  @Column({ default: 0 })
  lifetimePoints: number;

  @Column({ type: 'enum', enum: UserTier, default: UserTier.BRONZE })
  currentTier: UserTier;

  @Column({ default: 0 })
  purchaseCount: number;

  @Column({ default: 0 })
  currentStampCount: number;

  @Column({ nullable: true, type: 'varchar' })
  refreshToken: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
