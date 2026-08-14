import { ReceiptStatus } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { ReceiptEntity } from './receipt.entity';

export interface CreateReceiptItemData {
  purchaseOrderItemId: string;
  quantity: string;
  rejectedQuantity: string;
  rejectionReason: string | null;
}

export interface CreateReceiptData {
  companyId: string;
  number: string;
  purchaseOrderId: string;
  receivedById: string;
  receivedAt: Date;
  status: ReceiptStatus;
  hasDivergence: boolean;
  notes: string | null;
  items: CreateReceiptItemData[];
}

export abstract class IReceiptRepository {
  abstract create(
    data: CreateReceiptData,
    context?: TransactionContext,
  ): Promise<ReceiptEntity>;

  abstract findById(
    id: string,
    companyId: string,
  ): Promise<ReceiptEntity | null>;

  abstract listByOrder(purchaseOrderId: string): Promise<ReceiptEntity[]>;

  abstract findLastNumber(
    companyId: string,
    prefix: string,
    context?: TransactionContext,
  ): Promise<string | null>;

  abstract lockOrderItems(
    purchaseOrderId: string,
    context: TransactionContext,
  ): Promise<void>;

  abstract incrementReceivedQuantity(
    purchaseOrderItemId: string,
    quantity: string,
    context: TransactionContext,
  ): Promise<void>;

  abstract sumReceivedAmountCents(purchaseOrderId: string): Promise<bigint>;
}
