import {
  PurchaseOrderItemModel as PrismaPurchaseOrderItem,
  PurchaseOrderModel as PrismaPurchaseOrder,
} from 'generated/prisma/models';
import {
  PurchaseOrderEntity,
  PurchaseOrderItemEntity,
} from '../../domain/purchase-order.entity';

export class PurchaseOrderItemMapper {
  static toDomain(
    this: void,
    raw: PrismaPurchaseOrderItem,
  ): PurchaseOrderItemEntity {
    const entity = new PurchaseOrderItemEntity();

    entity.id = raw.id;
    entity.purchaseOrderId = raw.purchase_order_id;
    entity.requestItemId = raw.request_item_id;
    entity.description = raw.description;
    entity.quantity = raw.quantity.toString();
    entity.unit = raw.unit;
    entity.unitPriceCents = raw.unit_price_cents;
    entity.totalCents = raw.total_cents;
    entity.receivedQuantity = raw.received_quantity.toString();
    entity.ncm = raw.ncm;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;

    return entity;
  }
}

export class PurchaseOrderMapper {
  static toDomain(
    this: void,
    raw: PrismaPurchaseOrder & { items?: PrismaPurchaseOrderItem[] },
  ): PurchaseOrderEntity {
    const entity = new PurchaseOrderEntity();

    entity.id = raw.id;
    entity.number = raw.number;
    entity.companyId = raw.company_id;
    entity.purchaseRequestId = raw.purchase_request_id;
    entity.supplierId = raw.supplier_id;
    entity.status = raw.status;
    entity.totalAmountCents = raw.total_amount_cents;
    entity.currency = raw.currency;
    entity.issuedById = raw.issued_by_id;
    entity.issuedAt = raw.issued_at;
    entity.expectedDeliveryAt = raw.expected_delivery_at;
    entity.sentToSupplierAt = raw.sent_to_supplier_at;
    entity.deliveryAddress = raw.delivery_address;
    entity.paymentTerms = raw.payment_terms;
    entity.notes = raw.notes;
    entity.canceledById = raw.canceled_by_id;
    entity.canceledAt = raw.canceled_at;
    entity.cancelReason = raw.cancel_reason;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;

    if (raw.items) {
      entity.items = raw.items.map(PurchaseOrderItemMapper.toDomain);
    }

    return entity;
  }
}
