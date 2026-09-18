import { RecurringFrequency } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { RecurringContractEntity } from './recurring-contract.entity';

export interface CreateRecurringContractData {
  companyId: string;
  sourceRequestId: string;
  supplierId: string;
  costCenterId: string;
  categoryId: string | null;
  chartAccountId: string | null;
  title: string;
  amountCents: bigint;
  frequency: RecurringFrequency;
  startDate: Date;
  nextOccurrenceDate: Date;
  createdById: string;
}

export interface CancelRecurringContractData {
  canceledAt: Date;
  cancelReason: string;
}

export interface ListRecurringContractsFilter {
  active?: boolean;
  sourceRequestId?: string;
}

export abstract class IRecurringContractRepository {
  abstract create(
    data: CreateRecurringContractData,
    context?: TransactionContext,
  ): Promise<RecurringContractEntity>;

  abstract findById(
    id: string,
    context?: TransactionContext,
  ): Promise<RecurringContractEntity | null>;

  abstract findBySourceRequestId(
    sourceRequestId: string,
  ): Promise<RecurringContractEntity | null>;

  abstract list(
    companyId: string,
    filter?: ListRecurringContractsFilter,
  ): Promise<RecurringContractEntity[]>;

  abstract listDueForGeneration(now: Date): Promise<RecurringContractEntity[]>;

  abstract cancel(
    id: string,
    data: CancelRecurringContractData,
    context?: TransactionContext,
  ): Promise<RecurringContractEntity>;

  abstract advanceNextOccurrence(
    id: string,
    nextOccurrenceDate: Date,
    context?: TransactionContext,
  ): Promise<void>;
}
