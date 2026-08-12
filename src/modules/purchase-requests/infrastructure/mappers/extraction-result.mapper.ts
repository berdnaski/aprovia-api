import { ExtractionResultModel as PrismaExtractionResult } from 'generated/prisma/models';
import { ExtractionRecord } from '../../domain/extraction-results.repository.interface';
import { ExtractedFields } from '../../domain/extraction.service';

export class ExtractionResultMapper {
  static toDomain(this: void, raw: PrismaExtractionResult): ExtractionRecord {
    return {
      id: raw.id,
      purchaseRequestId: raw.purchase_request_id,
      status: raw.status,
      fields: (raw.fields as ExtractedFields | null) ?? null,
      failureReason: raw.failure_reason,
      requestedById: raw.requested_by_id,
      createdAt: raw.created_at,
      completedAt: raw.completed_at,
    };
  }
}
