import { Injectable } from '@nestjs/common';
import { BudgetEntryEntity } from '../domain/budget-entry.entity';
import {
  IBudgetEntryRepository,
  ListBudgetEntriesFilter,
} from '../domain/budget-entries.repository.interface';
import { FindBudgetByIdUseCase } from './find-budget-by-id.use-case';

@Injectable()
export class ListBudgetEntriesUseCase {
  constructor(
    private readonly budgetEntryRepository: IBudgetEntryRepository,
    private readonly findBudgetByIdUseCase: FindBudgetByIdUseCase,
  ) {}

  async execute(
    budgetId: string,
    companyId: string,
    filter?: ListBudgetEntriesFilter,
  ): Promise<BudgetEntryEntity[]> {
    await this.findBudgetByIdUseCase.execute(budgetId, companyId);

    return this.budgetEntryRepository.listByBudget(budgetId, filter);
  }
}
