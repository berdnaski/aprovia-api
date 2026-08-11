import { Injectable } from '@nestjs/common';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import { BudgetEntity } from '../domain/budget.entity';
import { IBudgetRepository } from '../domain/budgets.repository.interface';

@Injectable()
export class ListCostCenterBudgetsUseCase {
  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
  ) {}

  async execute(
    costCenterId: string,
    companyId: string,
  ): Promise<BudgetEntity[]> {
    await this.findCostCenterByIdUseCase.execute(costCenterId, companyId);

    return this.budgetRepository.listByCostCenter(costCenterId);
  }
}
