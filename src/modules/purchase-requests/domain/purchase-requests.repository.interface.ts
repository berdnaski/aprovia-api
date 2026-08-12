import { RequestStatus, Urgency } from 'generated/prisma/enums';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { PurchaseRequestEntity } from './purchase-request.entity';
import { RequestVisibility } from './services/request-visibility.service';

export interface CreatePurchaseRequestData {
  companyId: string;
  number: string;
  requesterId: string;
  costCenterId: string;
  categoryId: string | null;
  supplierId: string | null;
  title: string;
  description: string | null;
  urgency: Urgency;
  paymentTerms: string | null;
}

export interface UpdatePurchaseRequestData {
  costCenterId?: string;
  categoryId?: string | null;
  supplierId?: string | null;
  title?: string;
  description?: string | null;
  urgency?: Urgency;
  paymentTerms?: string | null;
}

export interface ListRequestsFilter {
  visibility: RequestVisibility;
  status?: RequestStatus[];
  costCenterId?: string;
  supplierId?: string;
  categoryId?: string;
  search?: string;
  skip: number;
  take: number;
}

export interface FindSimilarInput {
  companyId: string;
  requesterId: string;
  supplierId: string;
  amountCents: bigint;
  tolerancePercent: bigint;
  since: Date;
  excludeRequestId: string;
}

export interface MarkSubmittedData {
  totalAmountCents: bigint;
  submittedAt: Date;
  requiresOverride: boolean;
  status: RequestStatus;
}

export interface FinalizeData {
  status: RequestStatus;
  finalizedAt: Date | null;
}

export interface CancelData {
  canceledById: string;
  cancelReason: string;
}

export abstract class IPurchaseRequestRepository {
  abstract cancel(
    id: string,
    data: CancelData,
    context?: TransactionContext,
  ): Promise<PurchaseRequestEntity>;

  abstract finalize(
    id: string,
    data: FinalizeData,
    context?: TransactionContext,
  ): Promise<PurchaseRequestEntity>;

  abstract findRecentSimilar(
    input: FindSimilarInput,
  ): Promise<PurchaseRequestEntity[]>;

  abstract markSubmitted(
    id: string,
    data: MarkSubmittedData,
    context?: TransactionContext,
  ): Promise<PurchaseRequestEntity>;

  abstract create(
    data: CreatePurchaseRequestData,
    context?: TransactionContext,
  ): Promise<PurchaseRequestEntity>;

  abstract findById(
    id: string,
    context?: TransactionContext,
  ): Promise<PurchaseRequestEntity | null>;

  abstract findLastNumber(
    companyId: string,
    prefix: string,
    context?: TransactionContext,
  ): Promise<string | null>;

  abstract list(
    filter: ListRequestsFilter,
  ): Promise<Page<PurchaseRequestEntity>>;

  abstract update(
    id: string,
    data: UpdatePurchaseRequestData,
    context?: TransactionContext,
  ): Promise<PurchaseRequestEntity>;

  abstract updateTotal(
    id: string,
    totalAmountCents: bigint,
    context?: TransactionContext,
  ): Promise<void>;

  abstract delete(id: string, context?: TransactionContext): Promise<void>;

  abstract listManagedCostCenterIds(
    memberId: string,
    companyId: string,
  ): Promise<string[]>;
}
