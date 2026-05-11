import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
} from 'typeorm';

export enum TierName {
    BRONZE = 'BRONZE',
    SILVER = 'SILVER',
    GOLD = 'GOLD',
}

@Entity('tier_configs')
export class TierConfig {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
    type: 'enum',
    enum: TierName,
    unique: true,
    })
    tierName: TierName;

    @Column({
    type: 'int',
    })
    threshold: number;

    @Column()
    description: string;
}