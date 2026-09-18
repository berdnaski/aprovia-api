import { RecurringFrequency } from 'generated/prisma/enums';

export class RecurringContractEntity {
  id: string;
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

  active: boolean;
  canceledAt: Date | null;
  cancelReason: string | null;

  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}
