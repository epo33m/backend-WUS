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
    @Column()
    userId: number;

    @Column({
    nullable: true,
    })
    orderId: number;

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