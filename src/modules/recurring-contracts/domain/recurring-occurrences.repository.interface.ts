import { RecurringOccurrenceStatus } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { RecurringContractOccurrenceEntity } from './recurring-contract-occurrence.entity';

export interface CreateOccurrenceData {
  contractId: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  expectedAmountCents: bigint;
}

export interface MatchOccurrenceData {
  invoiceId: string;
  payableId: string;
  overrideNote: string | null;
}

export abstract class IRecurringOccurrenceRepository {
  abstract createIfAbsent(
    data: CreateOccurrenceData,
    context?: TransactionContext,
  ): Promise<{
    occurrence: RecurringContractOccurrenceEntity;
    created: boolean;
  }>;

  abstract findById(
    id: string,
    context?: TransactionContext,
  ): Promise<RecurringContractOccurrenceEntity | null>;

  abstract listByContract(
    contractId: string,
  ): Promise<RecurringContractOccurrenceEntity[]>;

  abstract findOldestPending(
    contractId: string,
    context?: TransactionContext,
  ): Promise<RecurringContractOccurrenceEntity | null>;

  abstract setBudgetEntry(
    id: string,
    budgetEntryId: string,
    context?: TransactionContext,
  ): Promise<void>;

  abstract markMatched(
    id: string,
    data: MatchOccurrenceData,
    context?: TransactionContext,
  ): Promise<RecurringContractOccurrenceEntity>;

  abstract setStatus(
    id: string,
    status: RecurringOccurrenceStatus,
    context?: TransactionContext,
  ): Promise<void>;
}
