import { BudgetDocumentEntity } from './budget-document.entity';

export interface CreateBudgetDocumentData {
  companyId: string;
  budgetId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: bigint;
  storageKey: string;
  sha256: string;
  description: string | null;
  uploadedById: string;
}

export abstract class IBudgetDocumentRepository {
  abstract create(
    data: CreateBudgetDocumentData,
  ): Promise<BudgetDocumentEntity>;

  abstract findById(id: string): Promise<BudgetDocumentEntity | null>;

  abstract listByBudget(budgetId: string): Promise<BudgetDocumentEntity[]>;

  abstract sumSizeByCompany(companyId: string): Promise<bigint>;
}
