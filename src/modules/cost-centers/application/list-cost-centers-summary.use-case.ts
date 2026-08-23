import { Injectable } from '@nestjs/common';
import { ICostCenterRepository } from '../domain/cost-centers.repository.interface';
import { CostCenterSummaryResponseDto } from '../dto/cost-center-summary-response.dto';
import { CostCenterSummaryRepository } from '../infrastructure/cost-center-summary.repository';

export const CostCenterBudgetStatus = {
  ALL: 'ALL',
  OVER_BUDGET: 'OVER_BUDGET',
  NEAR_LIMIT: 'NEAR_LIMIT',
  ATTENTION: 'ATTENTION',
  NO_BUDGET: 'NO_BUDGET',
} as const;

export type CostCenterBudgetStatus =
  (typeof CostCenterBudgetStatus)[keyof typeof CostCenterBudgetStatus];

const NEAR_LIMIT_PERCENT = 85;

export interface ListCostCentersSummaryOptions {
  includeDisabled?: boolean;
  search?: string;
  managerId?: string;
  budgetStatus?: CostCenterBudgetStatus;
}

@Injectable()
export class ListCostCentersSummaryUseCase {
  constructor(
    private readonly costCenterRepository: ICostCenterRepository,
    private readonly summaryRepository: CostCenterSummaryRepository,
  ) {}

  async execute(
    companyId: string,
    options?: ListCostCentersSummaryOptions,
  ): Promise<CostCenterSummaryResponseDto[]> {
    const [costCenters, summaries] = await Promise.all([
      this.costCenterRepository.list(companyId, {
        includeDisabled: options?.includeDisabled,
        search: options?.search,
        managerId: options?.managerId,
      }),
      this.summaryRepository.summarize(companyId, new Date()),
    ]);

    const dtos = costCenters.map((costCenter) =>
      CostCenterSummaryResponseDto.fromEntity(
        costCenter,
        summaries.get(costCenter.id),
      ),
    );

    return this.applyBudgetStatus(dtos, options?.budgetStatus);
  }

  private applyBudgetStatus(
    items: CostCenterSummaryResponseDto[],
    status?: CostCenterBudgetStatus,
  ): CostCenterSummaryResponseDto[] {
    if (!status || status === CostCenterBudgetStatus.ALL) {
      return items;
    }

    if (status === CostCenterBudgetStatus.NO_BUDGET) {
      return items.filter((item) => item.budget === null);
    }

    return items.filter((item) => {
      if (!item.budget) {
        return false;
      }

      const total = Number(item.budget.totalAmountCents);

      if (total <= 0) {
        return false;
      }

      const used =
        Number(item.budget.committedCents) +
        Number(item.budget.underReviewCents);
      const percent = Math.round((used / total) * 100);
      const overBudget = used > total;

      if (status === CostCenterBudgetStatus.OVER_BUDGET) {
        return overBudget;
      }

      if (status === CostCenterBudgetStatus.NEAR_LIMIT) {
        return !overBudget && percent >= NEAR_LIMIT_PERCENT;
      }

      return overBudget || percent >= NEAR_LIMIT_PERCENT;
    });
  }
}
