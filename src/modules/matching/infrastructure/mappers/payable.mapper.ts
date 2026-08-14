import { PayableModel as PrismaPayable } from 'generated/prisma/models';
import { PayableEntity } from '../../domain/payable.entity';

export class PayableMapper {
  static toDomain(this: void, raw: PrismaPayable): PayableEntity {
    const entity = new PayableEntity();

    entity.id = raw.id;
    entity.companyId = raw.company_id;
    entity.invoiceId = raw.invoice_id;
    entity.supplierId = raw.supplier_id;
    entity.amountCents = raw.amount_cents;
    entity.currency = raw.currency;
    entity.dueDate = raw.due_date;
    entity.status = raw.status;
    entity.releaseReason = raw.release_reason;
    entity.proofStorageKey = raw.proof_storage_key;
    entity.releaseNote = raw.release_note;
    entity.releasedById = raw.released_by_id;
    entity.releasedAt = raw.released_at;
    entity.paidAt = raw.paid_at;
    entity.barcode = raw.barcode;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;

    return entity;
  }
}
