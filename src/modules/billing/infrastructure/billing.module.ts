import { Global, Module } from '@nestjs/common';
import { AssignPlanUseCase } from '../application/assign-plan.use-case';
import { EntitlementsService } from '../application/entitlements.service';
import { GetSubscriptionUsageUseCase } from '../application/get-subscription-usage.use-case';
import { GrantFeatureOverrideUseCase } from '../application/grant-feature-override.use-case';
import { ListPlansUseCase } from '../application/list-plans.use-case';
import { StartTrialUseCase } from '../application/start-trial.use-case';
import {
  IPlanRepository,
  ISubscriptionRepository,
} from '../domain/plans.repository.interface';
import { ISeatUsageRepository } from '../domain/seat-usage.repository.interface';
import { BillingController } from './billing.controller';
import { PlanRepository, SubscriptionRepository } from './plans.repository';
import { SeatUsageRepository } from './seat-usage.repository';

@Global()
@Module({
  controllers: [BillingController],
  providers: [
    { provide: IPlanRepository, useClass: PlanRepository },
    { provide: ISubscriptionRepository, useClass: SubscriptionRepository },
    { provide: ISeatUsageRepository, useClass: SeatUsageRepository },
    EntitlementsService,
    ListPlansUseCase,
    GetSubscriptionUsageUseCase,
    AssignPlanUseCase,
    GrantFeatureOverrideUseCase,
    StartTrialUseCase,
  ],
  exports: [
    IPlanRepository,
    ISubscriptionRepository,
    ISeatUsageRepository,
    EntitlementsService,
    ListPlansUseCase,
    GetSubscriptionUsageUseCase,
    AssignPlanUseCase,
    GrantFeatureOverrideUseCase,
    StartTrialUseCase,
  ],
})
export class BillingModule {}
