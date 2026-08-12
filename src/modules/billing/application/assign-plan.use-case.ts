import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from 'generated/prisma/enums';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { SubscriptionEntity } from '../domain/plan.entity';
import {
  IPlanRepository,
  ISubscriptionRepository,
} from '../domain/plans.repository.interface';

export interface AssignPlanInput {
  planId: string;
  status?: SubscriptionStatus;
  periodEnd?: Date | null;
  contractedPriceCents?: bigint | null;
}

@Injectable()
export class AssignPlanUseCase {
  constructor(
    private readonly planRepository: IPlanRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    companyId: string,
    input: AssignPlanInput,
  ): Promise<SubscriptionEntity> {
    const plan = await this.planRepository.findById(input.planId);

    if (!plan) {
      throw new NotFoundError('Plano', input.planId);
    }

    return this.transactionManager.run(async (context) => {
      await this.subscriptionRepository.cancelActive(companyId, context);

      return this.subscriptionRepository.create(
        {
          companyId,
          planId: plan.id,
          status: input.status ?? SubscriptionStatus.ACTIVE,
          periodStart: new Date(),
          periodEnd: input.periodEnd ?? null,
          contractedPriceCents: input.contractedPriceCents ?? null,
        },
        context,
      );
    });
  }
}
