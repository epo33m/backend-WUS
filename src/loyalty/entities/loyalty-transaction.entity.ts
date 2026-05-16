import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

export enum LoyaltyTransactionReason {
    PURCHASE = 'PURCHASE',
    REDEMPTION = 'REDEMPTION',
    ADMIN_ADJUST = 'ADMIN_ADJUST',
    REFUND = 'REFUND',
}

@Entity('loyalty_transactions')
export class LoyaltyTransaction {
    @PrimaryGeneratedColumn()
    id: number;

    @Index('idx_loyalty_tx_user')
    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'uuid', nullable: true })
    orderId: string | null;

    @Column({
    type: 'int',
    })
    delta: number;

    @Column({
    type: 'enum',
    enum: LoyaltyTransactionReason,
    })
    reason: LoyaltyTransactionReason;

    @CreateDateColumn()
    createdAt: Date;
}