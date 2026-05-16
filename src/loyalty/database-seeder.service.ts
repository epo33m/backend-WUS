import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TierConfig, TierName } from './entities/tier-config.entity';

const TIER_SEEDS: Pick<TierConfig, 'tierName' | 'threshold' | 'description'>[] = [
  { tierName: TierName.BRONZE, threshold: 0,    description: 'Bronze tier (default)' },
  { tierName: TierName.SILVER, threshold: 1000, description: 'Silver tier' },
  { tierName: TierName.GOLD,   threshold: 5000, description: 'Gold tier' },
];

@Injectable()
export class DatabaseSeederService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(TierConfig)
    private readonly tierConfigRepository: Repository<TierConfig>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.tierConfigRepository.upsert(TIER_SEEDS, { conflictPaths: ['tierName'] });
  }
}
