import { Injectable } from '@nestjs/common';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { BudgetEntity } from '../domain/budget.entity';
import { IBudgetRepository } from '../domain/budgets.repository.interface';

@Injectable()
export class FindBudgetByIdUseCase {
  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
  ) {}

  async execute(
    id: string,
    companyId: string,
    context?: TransactionContext,
  ): Promise<BudgetEntity> {
    const budget = await this.budgetRepository.findById(id, context);

    if (!budget) {
      throw new NotFoundError('Orçamento', id);
    }

    await this.findCostCenterByIdUseCase.execute(
      budget.costCenterId,
      companyId,
      context,
    );

    return budget;
  }
}
