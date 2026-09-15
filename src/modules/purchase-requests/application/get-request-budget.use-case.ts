import { Injectable } from '@nestjs/common';
import { AssessBudgetAvailabilityUseCase } from 'src/modules/budgets/application/assess-budget-availability.use-case';
import { BudgetNotFoundForPeriodError } from 'src/modules/budgets/domain/budgets.errors';
import { BudgetVerdict } from 'src/modules/budgets/domain/services/budget-balance.service';
import { PurchaseRequestEntity } from '../domain/purchase-request.entity';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from './find-request-by-id.use-case';

export const RequestBudgetVerdict = {
  ...BudgetVerdict,
  NO_BUDGET: 'NO_BUDGET',
} as const;

export type RequestBudgetVerdict =
  (typeof RequestBudgetVerdict)[keyof typeof RequestBudgetVerdict];

export interface RequestBudget {
  verdict: RequestBudgetVerdict;
  amountCents: bigint;
  totalCents: bigint | null;
  committedCents: bigint | null;
  availableCents: bigint | null;
  overrunCents: bigint | null;
  toleranceCents: bigint | null;
}

@Injectable()
export class GetRequestBudgetUseCase {
  constructor(
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly assessBudgetAvailabilityUseCase: AssessBudgetAvailabilityUseCase,
  ) {}

  async execute(
    requestId: string,
    actor: RequestActor,
  ): Promise<RequestBudget> {
    const request = await this.findRequestByIdUseCase.execute(requestId, actor);

    return this.forRequest(request, actor.companyId);
  }

  async forRequest(
    request: PurchaseRequestEntity,
    companyId: string,
  ): Promise<RequestBudget> {
    try {
      const assessment = await this.assessBudgetAvailabilityUseCase.execute(
        request.costCenterId,
        companyId,
        request.totalAmountCents,
      );

      return {
        verdict: assessment.verdict,
        amountCents: assessment.amountCents,
        totalCents: assessment.balance.totalAmountCents,
        committedCents: assessment.balance.committedCents,
        availableCents: assessment.balance.availableCents,
        overrunCents: assessment.overrunCents,
        toleranceCents: assessment.toleranceCents,
      };
    } catch (error) {
      if (!(error instanceof BudgetNotFoundForPeriodError)) {
        throw error;
      }

      return {
        verdict: RequestBudgetVerdict.NO_BUDGET,
        amountCents: request.totalAmountCents,
        totalCents: null,
        committedCents: null,
        availableCents: null,
        overrunCents: null,
        toleranceCents: null,
      };
    }
  }
}
