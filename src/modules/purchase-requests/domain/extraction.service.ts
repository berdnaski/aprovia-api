export interface ExtractionSource {
  text?: string;
  fileId?: string;
}

export interface ExtractedItem {
  description: string;
  quantity: string;
  unit: string;
  unitPriceCents: string | null;
}

export interface ExtractedCostCenterSplit {
  costCenterName: string;
  percent: number;
}

export interface ExtractedFields {
  title: string | null;
  description: string | null;
  supplierCnpj: string | null;
  supplierName: string | null;
  totalAmountCents: string | null;
  categoryName: string | null;
  costCenterName: string | null;
  costCenterSplits: ExtractedCostCenterSplit[] | null;
  paymentTerms: string | null;
  foreignCurrencyNote: string | null;
  items: ExtractedItem[];
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
  retryable?: boolean;
}

export const EMPTY_EXTRACTION: ExtractedFields = {
  title: null,
  description: null,
  supplierCnpj: null,
  supplierName: null,
  totalAmountCents: null,
  categoryName: null,
  costCenterName: null,
  costCenterSplits: null,
  paymentTerms: null,
  foreignCurrencyNote: null,
  items: [],
};

export abstract class IExtractionService {
  abstract extract(
    companyId: string,
    source: ExtractionSource,
  ): Promise<ExtractionResult>;
}
