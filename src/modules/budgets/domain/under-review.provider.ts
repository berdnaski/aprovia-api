import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';

export abstract class IUnderReviewProvider {
  abstract sumUnderReview(
    costCenterId: string,
    periodStart: Date,
    periodEnd: Date,
    context?: TransactionContext,
  ): Promise<bigint>;
}

@Injectable()
export class UnderReviewRegistry {
  private provider: IUnderReviewProvider | null = null;

  register(provider: IUnderReviewProvider): void {
    this.provider = provider;
  }

  async sumFor(
    costCenterId: string,
    periodStart: Date,
    periodEnd: Date,
    context?: TransactionContext,
  ): Promise<bigint> {
    if (!this.provider) {
      return 0n;
    }

    return this.provider.sumUnderReview(
      costCenterId,
      periodStart,
      periodEnd,
      context,
    );
  }
}
