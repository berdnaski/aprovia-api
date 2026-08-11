import { BudgetEntryType } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { BudgetEntryEntity } from './budget-entry.entity';

export interface CreateBudgetEntryData {
  budgetId: string;
  purchaseRequestId: string;
  type: BudgetEntryType;
  amountCents: bigint;
  description?: string | null;
  recordedById?: string | null;
}

export abstract class IBudgetEntryRepository {
  abstract create(
    data: CreateBudgetEntryData,
    context?: TransactionContext,
  ): Promise<BudgetEntryEntity>;

  abstract sumByBudget(
    budgetId: string,
    context?: TransactionContext,
  ): Promise<bigint>;

  abstract listByBudget(budgetId: string): Promise<BudgetEntryEntity[]>;

  abstract listByPurchaseRequest(
    purchaseRequestId: string,
    context?: TransactionContext,
  ): Promise<BudgetEntryEntity[]>;
}
