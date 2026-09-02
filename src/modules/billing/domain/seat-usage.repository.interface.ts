import { TransactionContext } from 'src/shared/domain/transaction.manager';

export abstract class ISeatUsageRepository {
  abstract countOccupiedSeats(
    companyId: string,
    context?: TransactionContext,
  ): Promise<number>;
}

export abstract class IRequestUsageRepository {
  abstract countSubmittedThisMonth(
    companyId: string,
    reference: Date,
    context?: TransactionContext,
  ): Promise<number>;
}
