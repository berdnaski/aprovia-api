import {
  ReceiptItemModel as PrismaReceiptItem,
  ReceiptModel as PrismaReceipt,
} from 'generated/prisma/models';
import { ReceiptEntity, ReceiptItemEntity } from '../../domain/receipt.entity';

export class ReceiptItemMapper {
  static toDomain(this: void, raw: PrismaReceiptItem): ReceiptItemEntity {
    const entity = new ReceiptItemEntity();

    entity.id = raw.id;
    entity.receiptId = raw.receipt_id;
    entity.purchaseOrderItemId = raw.purchase_order_item_id;
    entity.quantity = raw.quantity.toString();
    entity.rejectedQuantity = raw.rejected_quantity.toString();
    entity.rejectionReason = raw.rejection_reason;
    entity.createdAt = raw.created_at;

    return entity;
  }
}

export class ReceiptMapper {
  static toDomain(
    this: void,
    raw: PrismaReceipt & { items?: PrismaReceiptItem[] },
  ): ReceiptEntity {
    const entity = new ReceiptEntity();

    entity.id = raw.id;
    entity.number = raw.number;
    entity.companyId = raw.company_id;
    entity.purchaseOrderId = raw.purchase_order_id;
    entity.receivedById = raw.received_by_id;
    entity.receivedAt = raw.received_at;
    entity.status = raw.status;
    entity.hasDivergence = raw.has_divergence;
    entity.notes = raw.notes;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;

    if (raw.items) {
      entity.items = raw.items.map(ReceiptItemMapper.toDomain);
    }

    return entity;
  }
}
