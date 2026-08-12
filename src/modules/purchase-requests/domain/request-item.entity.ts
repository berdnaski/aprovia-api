export class RequestItemEntity {
  id: string;
  purchaseRequestId: string;
  description: string;
  quantity: string;
  unit: string;
  unitPriceCents: bigint;
  totalCents: bigint;
  createdAt: Date;
  updatedAt: Date;
}
