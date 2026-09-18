import { Injectable } from '@nestjs/common';
import {
  ITransactionManager,
  TransactionContext,
} from 'src/shared/domain/transaction.manager';
import { ChartAlreadyExistsError } from '../domain/chart-accounts.errors';
import { IChartAccountRepository } from '../domain/chart-accounts.repository.interface';
import {
  MODEL_CATEGORY_ACCOUNTS,
  MODEL_CHART_ROWS,
} from '../domain/model-chart';
import { ImportChartAccountsUseCase } from './import-chart-accounts.use-case';

export interface ModelChartOutcome {
  created: number;
  categoriesLinked: number;
}

@Injectable()
export class ApplyModelChartUseCase {
  constructor(
    private readonly chartAccountRepository: IChartAccountRepository,
    private readonly importChartAccountsUseCase: ImportChartAccountsUseCase,
    private readonly transactionManager: ITransactionManager,
  ) {}

  execute(
    companyId: string,
    userId: string | null,
    context?: TransactionContext,
  ): Promise<ModelChartOutcome> {
    if (context) {
      return this.apply(companyId, userId, context);
    }

    return this.transactionManager.run((transaction) =>
      this.apply(companyId, userId, transaction),
    );
  }

  private async apply(
    companyId: string,
    userId: string | null,
    context: TransactionContext,
  ): Promise<ModelChartOutcome> {
    const existing = await this.chartAccountRepository.list(
      companyId,
      { includeInactive: true },
      context,
    );

    if (existing.length > 0) {
      throw new ChartAlreadyExistsError();
    }

    const outcome = await this.importChartAccountsUseCase.importRows(
      companyId,
      userId,
      MODEL_CHART_ROWS,
      context,
    );

    const links = new Map(
      Object.entries(MODEL_CATEGORY_ACCOUNTS).flatMap(([category, code]) => {
        const accountId = outcome.codeToId.get(code);
        return accountId ? [[category, accountId] as const] : [];
      }),
    );

    const categoriesLinked =
      await this.chartAccountRepository.assignCategoryDefaults(
        companyId,
        links,
        context,
      );

    return { created: outcome.created, categoriesLinked };
  }
}
