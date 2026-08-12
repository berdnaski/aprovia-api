import { Injectable, Logger } from '@nestjs/common';
import { PlanTier, SubscriptionStatus } from 'generated/prisma/enums';
import { IPlanRepository } from '../domain/plans.repository.interface';
import { AssignPlanUseCase } from './assign-plan.use-case';

const TRIAL_DAYS = 14;
const TRIAL_TIER = PlanTier.PROFESSIONAL;

@Injectable()
export class StartTrialUseCase {
  private readonly logger = new Logger(StartTrialUseCase.name);

  constructor(
    private readonly planRepository: IPlanRepository,
    private readonly assignPlanUseCase: AssignPlanUseCase,
  ) {}

  async execute(companyId: string): Promise<void> {
    const plan = await this.planRepository.findByTier(TRIAL_TIER);

    if (!plan) {
      this.logger.error(
        `Plano ${TRIAL_TIER} não cadastrado: a empresa ${companyId} ficará sem assinatura e sem operar`,
      );
      return;
    }

    await this.assignPlanUseCase.execute(companyId, {
      planId: plan.id,
      status: SubscriptionStatus.TRIALING,
      periodEnd: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
    });
  }
}
