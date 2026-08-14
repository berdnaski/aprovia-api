import { ReceiptStatus } from 'generated/prisma/enums';

export class ReceiptItemEntity {
  id: string;
  receiptId: string;
  purchaseOrderItemId: string;
  quantity: string;
  rejectedQuantity: string;
  rejectionReason: string | null;
  createdAt: Date;
}

export class ReceiptEntity {
  id: string;
  number: string;
  companyId: string;
  purchaseOrderId: string;
  receivedById: string;
  receivedAt: Date;
  status: ReceiptStatus;
  hasDivergence: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: ReceiptItemEntity[];
}
