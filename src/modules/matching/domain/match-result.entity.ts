import { DivergenceKind, MatchStatus } from 'generated/prisma/enums';

export class MatchDivergenceEntity {
  id: string;
  matchResultId: string;
  kind: DivergenceKind;
  purchaseOrderItemId: string | null;
  invoiceItemId: string | null;
  expectedValue: string;
  actualValue: string;
  differenceCents: bigint | null;
  differencePercent: string | null;
}

export class MatchResultEntity {
  id: string;
  companyId: string;
  purchaseOrderId: string;
  invoiceId: string;
  status: MatchStatus;
  checkedAt: Date;
  priceTolerancePercent: string;
  quantityTolerancePercent: string;
  orderedAmountCents: bigint;
  receivedAmountCents: bigint;
  invoicedAmountCents: bigint;
  resolvedById: string | null;
  resolvedAt: Date | null;
  resolutionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  divergences?: MatchDivergenceEntity[];
}
