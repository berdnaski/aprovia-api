import { Injectable } from '@nestjs/common';
import { Entitlements } from '../domain/entitlements';
import { SubscriptionWithPlan } from '../domain/plan.entity';
import { ISubscriptionRepository } from '../domain/plans.repository.interface';
import { ISeatUsageRepository } from '../domain/seat-usage.repository.interface';
import { EntitlementsService } from './entitlements.service';

export interface SubscriptionUsage {
  current: SubscriptionWithPlan | null;
  entitlements: Entitlements;
  usedSeats: number;
}

@Injectable()
export class GetSubscriptionUsageUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly seatUsageRepository: ISeatUsageRepository,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  async execute(companyId: string): Promise<SubscriptionUsage> {
    const [current, entitlements, usedSeats] = await Promise.all([
      this.subscriptionRepository.findActiveByCompany(companyId),
      this.entitlementsService.forCompany(companyId),
      this.seatUsageRepository.countOccupiedSeats(companyId),
    ]);

    return { current, entitlements, usedSeats };
  }
}
