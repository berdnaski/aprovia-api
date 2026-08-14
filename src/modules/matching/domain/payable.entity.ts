import { PayableReleaseReason, PayableStatus } from 'generated/prisma/enums';

export class PayableEntity {
  id: string;
  companyId: string;
  invoiceId: string | null;
  supplierId: string;
  amountCents: bigint;
  currency: string;
  dueDate: Date;
  status: PayableStatus;
  releaseReason: PayableReleaseReason | null;
  proofStorageKey: string | null;
  releaseNote: string | null;
  releasedById: string | null;
  releasedAt: Date | null;
  paidAt: Date | null;
  barcode: string | null;
  createdAt: Date;
  updatedAt: Date;
}
