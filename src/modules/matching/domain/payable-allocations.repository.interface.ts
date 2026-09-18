import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { PayableAllocationEntity } from './payable-allocation.entity';

export interface CreatePayableAllocationData {
  costCenterId: string;
  chartAccountId: string | null;
  amountCents: bigint;
}

export abstract class IPayableAllocationRepository {
  abstract listByPayable(
    payableId: string,
    context?: TransactionContext,
  ): Promise<PayableAllocationEntity[]>;

  abstract replace(
    payableId: string,
    lines: CreatePayableAllocationData[],
    context?: TransactionContext,
  ): Promise<PayableAllocationEntity[]>;

  abstract sumPaidByCostCenterAndPeriod(
    costCenterId: string,
    periodStart: Date,
    periodEnd: Date,
    context?: TransactionContext,
  ): Promise<bigint>;
}
