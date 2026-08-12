export interface ExtractionSource {
  text?: string;
  fileId?: string;
}

export interface ExtractedFields {
  supplierCnpj: string | null;
  supplierName: string | null;
  totalAmountCents: string | null;
  categoryName: string | null;
  paymentTerms: string | null;
}

export const ExtractionStatus = {
  QUEUED: 'QUEUED',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
} as const;

export type ExtractionStatus =
  (typeof ExtractionStatus)[keyof typeof ExtractionStatus];

export interface ExtractionResult {
  status: ExtractionStatus;
  fields: ExtractedFields | null;
  failureReason: string | null;
  extractedAt: Date | null;
}

export const EMPTY_EXTRACTION: ExtractedFields = {
  supplierCnpj: null,
  supplierName: null,
  totalAmountCents: null,
  categoryName: null,
  paymentTerms: null,
};

export abstract class IExtractionService {
  abstract extract(
    companyId: string,
    source: ExtractionSource,
  ): Promise<ExtractionResult>;
}
