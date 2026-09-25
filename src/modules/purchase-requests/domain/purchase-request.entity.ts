import { RequestStatus, Urgency } from 'generated/prisma/enums';

export class PurchaseRequestEntity {
  id: string;
  number: string;
  companyId: string;
  requesterId: string;
  costCenterId: string | null;
  categoryId: string | null;
  supplierId: string | null;

  title: string;
  description: string | null;
  totalAmountCents: bigint;

  urgency: Urgency;
  status: RequestStatus;
  paymentTerms: string | null;
  requiresOverride: boolean;

  createdAt: Date;
  submittedAt: Date | null;
  finalizedAt: Date | null;

  canceledById: string | null;
  cancelReason: string | null;

  updatedAt: Date;

  /** Só a listagem preenche: quem decide agora, quando status é PENDING. */
  currentApproverName?: string | null;

  get isDraft(): boolean {
    return this.status === RequestStatus.DRAFT;
  }
}
