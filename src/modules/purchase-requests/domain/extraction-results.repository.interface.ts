import { ExtractedFields, ExtractionStatus } from './extraction.service';

export interface ExtractionRecord {
  id: string;
  purchaseRequestId: string;
  status: ExtractionStatus;
  fields: ExtractedFields | null;
  failureReason: string | null;
  requestedById: string;
  createdAt: Date;
  completedAt: Date | null;
}

export interface CompleteExtractionData {
  status: ExtractionStatus;
  fields: ExtractedFields | null;
  failureReason: string | null;
}

export abstract class IExtractionResultRepository {
  abstract enqueue(
    purchaseRequestId: string,
    requestedById: string,
  ): Promise<ExtractionRecord>;

  abstract complete(
    id: string,
    data: CompleteExtractionData,
  ): Promise<ExtractionRecord>;

  abstract findLatest(
    purchaseRequestId: string,
  ): Promise<ExtractionRecord | null>;
}
