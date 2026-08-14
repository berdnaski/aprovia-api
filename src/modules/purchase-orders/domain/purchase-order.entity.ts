import { PurchaseOrderStatus } from 'generated/prisma/enums';

export class PurchaseOrderItemEntity {
  id: string;
  purchaseOrderId: string;
  requestItemId: string | null;
  description: string;
  quantity: string;
  unit: string;
  unitPriceCents: bigint;
  totalCents: bigint;
  receivedQuantity: string;
  ncm: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PurchaseOrderEntity {
  id: string;
  number: string;
  companyId: string;
  purchaseRequestId: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  totalAmountCents: bigint;
  currency: string;
  issuedById: string;
  issuedAt: Date;
  expectedDeliveryAt: Date | null;
  sentToSupplierAt: Date | null;
  deliveryAddress: string | null;
  paymentTerms: string | null;
  notes: string | null;
  canceledById: string | null;
  canceledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: PurchaseOrderItemEntity[];
}
