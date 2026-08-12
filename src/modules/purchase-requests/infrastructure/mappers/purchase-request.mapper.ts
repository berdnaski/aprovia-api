import {
  PurchaseRequestModel as PrismaPurchaseRequest,
  RequestItemModel as PrismaRequestItem,
  FileModel as PrismaFile,
} from 'generated/prisma/models';
import { PurchaseRequestEntity } from '../../domain/purchase-request.entity';
import { RequestItemEntity } from '../../domain/request-item.entity';
import { RequestFileEntity } from '../../domain/request-file.entity';

export class PurchaseRequestMapper {
  static toDomain(
    this: void,
    raw: PrismaPurchaseRequest,
  ): PurchaseRequestEntity {
    const entity = new PurchaseRequestEntity();

    entity.id = raw.id;
    entity.number = raw.number;
    entity.companyId = raw.company_id;
    entity.requesterId = raw.requester_id;
    entity.costCenterId = raw.cost_center_id;
    entity.categoryId = raw.category_id;
    entity.supplierId = raw.supplier_id;
    entity.title = raw.title;
    entity.description = raw.description;
    entity.totalAmountCents = raw.total_amount_cents;
    entity.urgency = raw.urgency;
    entity.status = raw.status;
    entity.paymentTerms = raw.payment_terms;
    entity.requiresOverride = raw.requires_override;
    entity.createdAt = raw.created_at;
    entity.submittedAt = raw.submitted_at;
    entity.finalizedAt = raw.finalized_at;
    entity.canceledById = raw.canceled_by_id;
    entity.cancelReason = raw.cancel_reason;
    entity.updatedAt = raw.updated_at;

    return entity;
  }
}

export class RequestItemMapper {
  static toDomain(this: void, raw: PrismaRequestItem): RequestItemEntity {
    const entity = new RequestItemEntity();

    entity.id = raw.id;
    entity.purchaseRequestId = raw.purchase_request_id;
    entity.description = raw.description;
    entity.quantity = raw.quantity.toString();
    entity.unit = raw.unit;
    entity.unitPriceCents = raw.unit_price_cents;
    entity.totalCents = raw.total_cents;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;

    return entity;
  }
}

export class RequestFileMapper {
  static toDomain(this: void, raw: PrismaFile): RequestFileEntity {
    const entity = new RequestFileEntity();

    entity.id = raw.id;
    entity.companyId = raw.company_id;
    entity.type = raw.type;
    entity.purchaseRequestId = raw.purchase_request_id;
    entity.userId = raw.user_id;
    entity.fileName = raw.file_name;
    entity.mimeType = raw.mime_type;
    entity.sizeBytes = raw.size_bytes;
    entity.storageKey = raw.storage_key;
    entity.uploadedById = raw.uploaded_by_id;
    entity.uploadedAt = raw.uploaded_at;

    return entity;
  }
}
