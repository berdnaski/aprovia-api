import { SupplierBankAccountModel as PrismaSupplierBankAccount } from 'generated/prisma/models';
import { SupplierBankAccountEntity } from '../../domain/supplier-bank-account.entity';

export class SupplierBankAccountMapper {
  static toDomain(
    this: void,
    raw: PrismaSupplierBankAccount,
  ): SupplierBankAccountEntity {
    const entity = new SupplierBankAccountEntity();

    entity.id = raw.id;
    entity.companyId = raw.company_id;
    entity.supplierId = raw.supplier_id;
    entity.bankCode = raw.bank_code;
    entity.branch = raw.branch;
    entity.accountNumber = raw.account_number;
    entity.accountDigit = raw.account_digit;
    entity.accountType = raw.account_type;
    entity.holderName = raw.holder_name;
    entity.holderDocument = raw.holder_document;
    entity.pixKeyType = raw.pix_key_type;
    entity.pixKey = raw.pix_key;
    entity.thirdParty = raw.third_party;
    entity.justification = raw.justification;
    entity.status = raw.status;
    entity.requestedById = raw.requested_by_id;
    entity.requestedAt = raw.requested_at;
    entity.reviewedById = raw.reviewed_by_id;
    entity.reviewedAt = raw.reviewed_at;
    entity.reviewNote = raw.review_note;
    entity.archivedAt = raw.archived_at;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;

    return entity;
  }
}
