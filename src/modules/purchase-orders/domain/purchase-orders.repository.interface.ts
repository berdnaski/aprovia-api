import { PurchaseOrderStatus } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { Page } from 'src/shared/dto/pagination-query.dto';
import {
  PurchaseOrderEntity,
  PurchaseOrderItemEntity,
} from './purchase-order.entity';

export interface CreatePurchaseOrderItemData {
  requestItemId: string | null;
  description: string;
  quantity: string;
  unit: string;
  unitPriceCents: bigint;
  totalCents: bigint;
}

export interface CreatePurchaseOrderData {
  companyId: string;
  number: string;
  purchaseRequestId: string;
  supplierId: string;
  totalAmountCents: bigint;
  issuedById: string;
  expectedDeliveryAt: Date | null;
  deliveryAddress: string | null;
  paymentTerms: string | null;
  notes: string | null;
  items: CreatePurchaseOrderItemData[];
}

export interface ListPurchaseOrdersFilter {
  companyId: string;
  status?: PurchaseOrderStatus[];
  supplierId?: string;
  search?: string;
  skip: number;
  take: number;
  page: number;
  perPage: number;
}

export interface ItemBalance {
  itemId: string;
  description: string;
  unit: string;
  orderedQuantity: string;
  receivedQuantity: string;
  pendingQuantity: string;
}

export abstract class IPurchaseOrderRepository {
  abstract create(
    data: CreatePurchaseOrderData,
    context?: TransactionContext,
  ): Promise<PurchaseOrderEntity>;

  abstract findById(
    id: string,
    companyId: string,
    context?: TransactionContext,
  ): Promise<PurchaseOrderEntity | null>;

  abstract findByRequestId(
    purchaseRequestId: string,
  ): Promise<PurchaseOrderEntity | null>;

  abstract findLastNumber(
    companyId: string,
    prefix: string,
    context?: TransactionContext,
  ): Promise<string | null>;

  abstract list(
    filter: ListPurchaseOrdersFilter,
  ): Promise<Page<PurchaseOrderEntity>>;

  abstract listItems(
    purchaseOrderId: string,
    context?: TransactionContext,
  ): Promise<PurchaseOrderItemEntity[]>;

  abstract updateStatus(
    id: string,
    status: PurchaseOrderStatus,
    context?: TransactionContext,
  ): Promise<PurchaseOrderEntity>;

  abstract markAsSent(id: string, sentAt: Date): Promise<PurchaseOrderEntity>;

  abstract cancel(
    id: string,
    canceledById: string,
    reason: string,
  ): Promise<PurchaseOrderEntity>;

  abstract countReceipts(purchaseOrderId: string): Promise<number>;
}
