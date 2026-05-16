import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

export enum CouponSource {
    MANUAL = 'MANUAL',
    MILESTONE_AUTO = 'MILESTONE_AUTO',
    STORE_REDEMPTION = 'STORE_REDEMPTION',
}

export enum CouponStatus {
    AVAILABLE = 'AVAILABLE',
    RESERVED = 'RESERVED',
    USED = 'USED',
    EXPIRED = 'EXPIRED',
}

export enum DiscountType {
    FIXED_AMOUNT = 'FIXED_AMOUNT',
    PERCENTAGE = 'PERCENTAGE',
}

export enum CouponAppliesTo {
    ORDER = 'ORDER',
}

@Entity('coupons')
export class Coupon {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column({ length: 6, unique: true })
    code!: string;

    @Column({
    type: 'enum',
    enum: CouponSource,
    })
    source!: CouponSource;

    @Column({
    type: 'enum',
    enum: CouponStatus,
    })
    status!: CouponStatus;

    @Column({
    type: 'enum',
    enum: DiscountType,
    })
    discountType!: DiscountType;

    @Column()
    discountValue!: number;

    @Column({
    nullable: true,
    })
    maxValue!: number;

    @Column({
    nullable: true,
    })
    reservedByIdempotencyKey!: string;

    @Column()
    expiresAt!: Date;

    @Column({
    type: 'enum',
    enum: CouponAppliesTo,
    })
    appliesTo!: CouponAppliesTo;

    @CreateDateColumn()
    createdAt!: Date;
}