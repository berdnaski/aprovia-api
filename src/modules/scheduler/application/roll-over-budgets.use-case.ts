import { Injectable, Logger } from '@nestjs/common';
import { IBudgetRepository } from 'src/modules/budgets/domain/budgets.repository.interface';
import { BudgetPeriodService } from 'src/modules/budgets/domain/services/budget-period.service';

@Injectable()
export class RollOverBudgetsUseCase {
  private readonly logger = new Logger(RollOverBudgetsUseCase.name);

  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly budgetPeriodService: BudgetPeriodService,
  ) {}

  async execute(reference: Date = new Date()): Promise<number> {
    const currentKey = this.budgetPeriodService.currentMonthKey(reference);
    const current = this.budgetPeriodService.fromMonthKey(currentKey);

    const previousKey = this.budgetPeriodService.currentMonthKey(
      new Date(current.periodStart.getTime() - 1),
    );
    const previous = this.budgetPeriodService.fromMonthKey(previousKey);

    const source = await this.budgetRepository.listByPeriodStart(
      previous.periodStart,
    );

    const created = await this.budgetRepository.createManyIfAbsent(
      source.map((budget) => ({
        costCenterId: budget.costCenterId,
        periodStart: current.periodStart,
        periodEnd: current.periodEnd,
        totalAmountCents: budget.totalAmountCents,
      })),
    );

    this.logger.log(
      `Virada orçamentária ${previousKey} -> ${currentKey}: ${created} de ${source.length} orçamento(s) replicado(s)`,
    );

    return created;
  }
}
