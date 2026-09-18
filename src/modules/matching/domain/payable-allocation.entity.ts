export class PayableAllocationEntity {
  id: string;
  payableId: string;
  costCenterId: string;
  chartAccountId: string | null;
  amountCents: bigint;
  createdAt: Date;
}
