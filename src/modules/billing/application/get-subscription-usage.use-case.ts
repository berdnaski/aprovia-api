import { Injectable } from '@nestjs/common';
import { Entitlements } from '../domain/entitlements';
import { SubscriptionWithPlan } from '../domain/plan.entity';
import { ISubscriptionRepository } from '../domain/plans.repository.interface';
import {
  IRequestUsageRepository,
  ISeatUsageRepository,
} from '../domain/seat-usage.repository.interface';
import { EntitlementsService } from './entitlements.service';

export interface SubscriptionUsage {
  current: SubscriptionWithPlan | null;
  entitlements: Entitlements;
  usedSeats: number;
  usedRequestsMonth: number;
}

@Injectable()
export class GetSubscriptionUsageUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly seatUsageRepository: ISeatUsageRepository,
    private readonly requestUsageRepository: IRequestUsageRepository,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  async execute(companyId: string): Promise<SubscriptionUsage> {
    const [current, entitlements, usedSeats, usedRequestsMonth] =
      await Promise.all([
        this.subscriptionRepository.findActiveByCompany(companyId),
        this.entitlementsService.forCompany(companyId),
        this.seatUsageRepository.countOccupiedSeats(companyId),
        this.requestUsageRepository.countSubmittedThisMonth(
          companyId,
          new Date(),
        ),
      ]);

    return { current, entitlements, usedSeats, usedRequestsMonth };
  }
}
