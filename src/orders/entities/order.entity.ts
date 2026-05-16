import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Session } from '../../sessions/entities/session.entity';
import { User } from '../../users/entities/user.entity';
import { Coupon } from '../../loyalty/entities/coupon.entity';

export enum OrderStatus {
  SUBMITTED = 'SUBMITTED',
  REVIEWING = 'REVIEWING',
  CONFIRMED = 'CONFIRMED',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('orders')
@Index('idx_orders_status_updated', ['status', 'updatedAt'])
@Index('idx_orders_user_status', ['userId', 'status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  idempotencyKey: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @Column({ type: 'uuid' })
  sessionId: string;

  /** Denormalized from session.table.tableNumber for cashier display */
  @Column({ type: 'int', nullable: true })
  tableNumber: number | null;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.SUBMITTED })
  status: OrderStatus;

  @ManyToOne(() => Coupon, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'couponId' })
  coupon: Coupon | null;

  @Column({ type: 'int', nullable: true })
  couponId: number | null;

  @Column({ type: 'int' })
  subtotal: number;

  @Column({ type: 'int', default: 0 })
  discountAmount: number;

  @Column({ type: 'int' })
  totalAmount: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cashierId' })
  cashier: User | null;

  @Column({ type: 'uuid', nullable: true })
  cashierId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}