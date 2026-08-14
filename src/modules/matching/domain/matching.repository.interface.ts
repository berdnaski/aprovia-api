import { DivergenceKind, MatchStatus } from 'generated/prisma/enums';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { MatchResultEntity } from './match-result.entity';

export interface CreateMatchDivergenceData {
  kind: DivergenceKind;
  purchaseOrderItemId: string | null;
  invoiceItemId: string | null;
  expectedValue: string;
  actualValue: string;
  differenceCents: bigint | null;
  differencePercent: string | null;
}

export interface CreateMatchResultData {
  companyId: string;
  purchaseOrderId: string;
  invoiceId: string;
  status: MatchStatus;
  priceTolerancePercent: string;
  quantityTolerancePercent: string;
  orderedAmountCents: bigint;
  receivedAmountCents: bigint;
  invoicedAmountCents: bigint;
  divergences: CreateMatchDivergenceData[];
}

export interface ListMatchResultsFilter {
  companyId: string;
  status?: MatchStatus[];
  skip: number;
  take: number;
  page: number;
  perPage: number;
}

export abstract class IMatchResultRepository {
  abstract create(data: CreateMatchResultData): Promise<MatchResultEntity>;

  abstract findById(
    id: string,
    companyId: string,
  ): Promise<MatchResultEntity | null>;

  abstract list(
    filter: ListMatchResultsFilter,
  ): Promise<Page<MatchResultEntity>>;

  abstract resolve(
    id: string,
    resolvedById: string,
    status: MatchStatus,
    note: string,
  ): Promise<MatchResultEntity>;
}
