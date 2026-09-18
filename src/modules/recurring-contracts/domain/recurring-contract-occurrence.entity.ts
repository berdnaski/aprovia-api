import { RecurringOccurrenceStatus } from 'generated/prisma/enums';

export class RecurringContractOccurrenceEntity {
  id: string;
  contractId: string;

  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;

  expectedAmountCents: bigint;
  status: RecurringOccurrenceStatus;

  budgetEntryId: string | null;
  invoiceId: string | null;
  payableId: string | null;
  overrideNote: string | null;

  createdAt: Date;
  matchedAt: Date | null;
}
