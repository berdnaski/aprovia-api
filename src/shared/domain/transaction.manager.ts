export const TransactionProvider = {
  PRISMA: 'prisma',
} as const;

export type TransactionProvider =
  (typeof TransactionProvider)[keyof typeof TransactionProvider];

export abstract class TransactionContext {
  abstract readonly provider: TransactionProvider;
}

export abstract class ITransactionManager {
  abstract run<T>(
    work: (context: TransactionContext) => Promise<T>,
  ): Promise<T>;
}
