export class BudgetDocumentEntity {
  id: string;
  companyId: string;
  budgetId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: bigint;
  storageKey: string;
  sha256: string;
  description: string | null;
  uploadedById: string;
  uploadedAt: Date;
}
