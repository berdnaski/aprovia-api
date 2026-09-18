import { FileModel as PrismaFile } from 'generated/prisma/models';
import { BudgetDocumentEntity } from '../../domain/budget-document.entity';

export class BudgetDocumentMapper {
  static toDomain(this: void, raw: PrismaFile): BudgetDocumentEntity {
    const entity = new BudgetDocumentEntity();

    entity.id = raw.id;
    entity.companyId = raw.company_id;
    entity.budgetId = raw.budget_id as string;
    entity.fileName = raw.file_name;
    entity.mimeType = raw.mime_type;
    entity.sizeBytes = raw.size_bytes;
    entity.storageKey = raw.storage_key;
    entity.sha256 = raw.sha256 as string;
    entity.description = raw.description;
    entity.uploadedById = raw.uploaded_by_id;
    entity.uploadedAt = raw.uploaded_at;

    return entity;
  }
}
