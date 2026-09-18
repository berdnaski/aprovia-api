import { Injectable } from '@nestjs/common';
import { BudgetDocumentEntity } from '../domain/budget-document.entity';
import { IBudgetDocumentRepository } from '../domain/budget-documents.repository.interface';
import { FindBudgetByIdUseCase } from './find-budget-by-id.use-case';

@Injectable()
export class ListBudgetDocumentsUseCase {
  constructor(
    private readonly budgetDocumentRepository: IBudgetDocumentRepository,
    private readonly findBudgetByIdUseCase: FindBudgetByIdUseCase,
  ) {}

  async execute(
    budgetId: string,
    companyId: string,
  ): Promise<BudgetDocumentEntity[]> {
    await this.findBudgetByIdUseCase.execute(budgetId, companyId);

    return this.budgetDocumentRepository.listByBudget(budgetId);
  }
}
