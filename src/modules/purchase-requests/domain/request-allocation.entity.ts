export class RequestAllocationEntity {
  id: string;
  purchaseRequestId: string;
  costCenterId: string;
  chartAccountId: string | null;
  shareBps: number;
  createdAt: Date;
}
