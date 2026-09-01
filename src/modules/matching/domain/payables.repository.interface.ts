import { PayableReleaseReason, PayableStatus } from 'generated/prisma/enums';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { PayableEntity } from './payable.entity';

export interface CreatePayableData {
  companyId: string;
  invoiceId: string | null;
  supplierId: string;
  amountCents: bigint;
  dueDate: Date;
  status?: PayableStatus;
  releaseReason?: PayableReleaseReason;
  releasedById?: string;
  releaseNote?: string;
}

export interface ReleasePayableData {
  releaseReason: PayableReleaseReason;
  releasedById: string;
  proofStorageKey: string | null;
  releaseNote: string | null;
}

export interface ListPayablesFilter {
  companyId: string;
  status?: PayableStatus[];
  supplierId?: string;
  skip: number;
  take: number;
  page: number;
  perPage: number;
}

export abstract class IPayableRepository {
  abstract create(data: CreatePayableData): Promise<PayableEntity>;

  abstract findById(
    id: string,
    companyId: string,
  ): Promise<PayableEntity | null>;

  abstract findByInvoiceId(invoiceId: string): Promise<PayableEntity | null>;

  abstract list(filter: ListPayablesFilter): Promise<Page<PayableEntity>>;

  abstract release(
    id: string,
    data: ReleasePayableData,
  ): Promise<PayableEntity>;

  abstract markAsPaid(id: string): Promise<PayableEntity>;
}
