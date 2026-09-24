import { Injectable } from '@nestjs/common';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import { IPayableAllocationRepository } from 'src/modules/matching/domain/payable-allocations.repository.interface';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { IBudgetEntryRepository } from '../domain/budget-entries.repository.interface';
import { BudgetNotFoundForPeriodError } from '../domain/budgets.errors';
import { IBudgetRepository } from '../domain/budgets.repository.interface';
import { FindBudgetByIdUseCase } from './find-budget-by-id.use-case';
import {
  BudgetBalance,
  BudgetBalanceService,
} from '../domain/services/budget-balance.service';
import { UnderReviewRegistry } from '../domain/under-review.provider';

@Injectable()
export class GetBudgetConsumptionUseCase {
  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly budgetEntryRepository: IBudgetEntryRepository,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly budgetBalanceService: BudgetBalanceService,
    private readonly underReviewRegistry: UnderReviewRegistry,
    private readonly payableAllocationRepository: IPayableAllocationRepository,
    private readonly findBudgetByIdUseCase: FindBudgetByIdUseCase,
  ) {}

  async execute(
    costCenterId: string,
    companyId: string,
    reference: Date = new Date(),
    context?: TransactionContext,
  ): Promise<BudgetBalance> {
    await this.findCostCenterByIdUseCase.execute(
      costCenterId,
      companyId,
      context,
    );

    const budget = await this.budgetRepository.findCoveringDate(
      costCenterId,
      reference,
      context,
    );

    if (!budget) {
      throw new BudgetNotFoundForPeriodError(reference);
    }

    const [committedCents, underReviewCents, realizedCents] =
      await Promise.all([
        this.budgetEntryRepository.sumByBudget(budget.id, context),
        this.underReviewRegistry.sumFor(
          costCenterId,
          budget.periodStart,
          budget.periodEnd,
          context,
        ),
        this.payableAllocationRepository.sumPaidByCostCenterAndPeriod(
          costCenterId,
          budget.periodStart,
          budget.periodEnd,
          context,
        ),
      ]);

    return this.budgetBalanceService.build(
      budget,
      committedCents,
      underReviewCents,
      realizedCents,
    );
  }

  async executeForBudget(
    budgetId: string,
    companyId: string,
    context?: TransactionContext,
  ): Promise<BudgetBalance> {
    const budget = await this.findBudgetByIdUseCase.execute(budgetId, companyId);

    const [committedCents, underReviewCents, realizedCents] =
      await Promise.all([
        this.budgetEntryRepository.sumByBudget(budget.id, context),
        this.underReviewRegistry.sumFor(
          budget.costCenterId,
          budget.periodStart,
          budget.periodEnd,
          context,
        ),
        this.payableAllocationRepository.sumPaidByCostCenterAndPeriod(
          budget.costCenterId,
          budget.periodStart,
          budget.periodEnd,
          context,
        ),
      ]);

    return this.budgetBalanceService.build(
      budget,
      committedCents,
      underReviewCents,
      realizedCents,
    );
  }
}
