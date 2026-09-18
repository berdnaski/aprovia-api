import { Injectable } from '@nestjs/common';
import { AssessBudgetAvailabilityUseCase } from 'src/modules/budgets/application/assess-budget-availability.use-case';
import { BudgetNotFoundForPeriodError } from 'src/modules/budgets/domain/budgets.errors';
import { BudgetVerdict } from 'src/modules/budgets/domain/services/budget-balance.service';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { PurchaseRequestEntity } from '../domain/purchase-request.entity';
import { sumByCostCenter } from '../domain/services/allocation-split';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from './find-request-by-id.use-case';
import { ManageRequestAllocationsUseCase } from './manage-request-allocations.use-case';

export const RequestBudgetVerdict = {
  ...BudgetVerdict,
  NO_BUDGET: 'NO_BUDGET',
} as const;

export type RequestBudgetVerdict =
  (typeof RequestBudgetVerdict)[keyof typeof RequestBudgetVerdict];

export interface CostCenterBudget {
  costCenterId: string;
  costCenterName: string;
  verdict: RequestBudgetVerdict;
  amountCents: bigint;
  totalCents: bigint | null;
  committedCents: bigint | null;
  availableCents: bigint | null;
  overrunCents: bigint | null;
  toleranceCents: bigint | null;
}

export interface RequestBudget extends Omit<
  CostCenterBudget,
  'costCenterId' | 'costCenterName' | 'amountCents'
> {
  amountCents: bigint;
  lines: CostCenterBudget[];
}

const SEVERITY: Record<RequestBudgetVerdict, number> = {
  REQUIRES_OVERRIDE: 3,
  WITHIN_TOLERANCE: 2,
  FITS: 1,
  NO_BUDGET: 0,
};

@Injectable()
export class GetRequestBudgetUseCase {
  constructor(
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly assessBudgetAvailabilityUseCase: AssessBudgetAvailabilityUseCase,
    private readonly manageRequestAllocationsUseCase: ManageRequestAllocationsUseCase,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
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
    reference?: Date,
    context?: TransactionContext,
  ): Promise<RequestBudget> {
    const allocations = await this.manageRequestAllocationsUseCase.effectiveFor(
      request,
      context,
    );
    const amounts = sumByCostCenter(allocations.lines);

    const lines: CostCenterBudget[] = [];

    for (const [costCenterId, amountCents] of amounts) {
      lines.push(
        await this.forCostCenter(
          costCenterId,
          companyId,
          amountCents,
          reference,
          context,
        ),
      );
    }

    const critical = lines.reduce((worst, line) =>
      SEVERITY[line.verdict] > SEVERITY[worst.verdict] ? line : worst,
    );

    return {
      verdict: critical.verdict,
      amountCents: request.totalAmountCents,
      totalCents: critical.totalCents,
      committedCents: critical.committedCents,
      availableCents: critical.availableCents,
      overrunCents: critical.overrunCents,
      toleranceCents: critical.toleranceCents,
      lines,
    };
  }

  private async forCostCenter(
    costCenterId: string,
    companyId: string,
    amountCents: bigint,
    reference?: Date,
    context?: TransactionContext,
  ): Promise<CostCenterBudget> {
    const costCenter = await this.findCostCenterByIdUseCase.execute(
      costCenterId,
      companyId,
      context,
    );

    try {
      const assessment = await this.assessBudgetAvailabilityUseCase.execute(
        costCenterId,
        companyId,
        amountCents,
        reference,
        context,
      );

      return {
        costCenterId,
        costCenterName: costCenter.name,
        verdict: assessment.verdict,
        amountCents,
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
        costCenterId,
        costCenterName: costCenter.name,
        verdict: RequestBudgetVerdict.NO_BUDGET,
        amountCents,
        totalCents: null,
        committedCents: null,
        availableCents: null,
        overrunCents: null,
        toleranceCents: null,
      };
    }
  }
}
