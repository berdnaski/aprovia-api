import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { BudgetEntity } from './budget.entity';

export interface CreateBudgetData {
  costCenterId: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmountCents: bigint;
}

export interface UpdateBudgetAmountData {
  totalAmountCents: bigint;
  changeReason: string | null;
  updatedById: string;
}

export abstract class IBudgetRepository {
  abstract create(
    data: CreateBudgetData,
    context?: TransactionContext,
  ): Promise<BudgetEntity>;

  abstract findById(
    id: string,
    context?: TransactionContext,
  ): Promise<BudgetEntity | null>;

  abstract findByPeriod(
    costCenterId: string,
    periodStart: Date,
    context?: TransactionContext,
  ): Promise<BudgetEntity | null>;

  abstract findOverlapping(
    costCenterId: string,
    periodStart: Date,
    periodEnd: Date,
    context?: TransactionContext,
  ): Promise<BudgetEntity | null>;

  abstract findCoveringDate(
    costCenterId: string,
    date: Date,
    context?: TransactionContext,
  ): Promise<BudgetEntity | null>;

  abstract listByCostCenter(costCenterId: string): Promise<BudgetEntity[]>;

  abstract updateAmount(
    id: string,
    data: UpdateBudgetAmountData,
    context?: TransactionContext,
  ): Promise<BudgetEntity>;
}
