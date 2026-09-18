import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { AllocationShare } from './services/allocation-split';
import { RequestAllocationEntity } from './request-allocation.entity';

export abstract class IRequestAllocationRepository {
  abstract listByRequest(
    purchaseRequestId: string,
    context?: TransactionContext,
  ): Promise<RequestAllocationEntity[]>;

  abstract replace(
    purchaseRequestId: string,
    lines: AllocationShare[],
    context?: TransactionContext,
  ): Promise<RequestAllocationEntity[]>;

  abstract deleteByRequest(
    purchaseRequestId: string,
    context?: TransactionContext,
  ): Promise<void>;
}
