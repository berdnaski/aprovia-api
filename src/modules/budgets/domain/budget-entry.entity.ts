import { BudgetEntryType } from 'generated/prisma/enums';

export class BudgetEntryEntity {
  id: string;
  budgetId: string;
  purchaseRequestId: string;
  type: BudgetEntryType;
  amountCents: bigint;
  description: string | null;
  recordedById: string | null;
  occurredAt: Date;
}
