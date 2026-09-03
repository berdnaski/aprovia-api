import { FeedbackKind, FeedbackStatus } from 'generated/prisma/enums';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { FeedbackEntity } from './feedback.entity';

export interface CreateFeedbackData {
  companyId: string;
  authorId: string;
  kind: FeedbackKind;
  message: string;
  route: string | null;
  userAgent: string | null;
  screenshotKey: string | null;
  screenshotMime: string | null;
  screenshotSizeBytes: number | null;
}

export interface ListFeedbacksFilter {
  companyId?: string;
  authorId?: string;
  status?: FeedbackStatus[];
  kind?: FeedbackKind[];
  search?: string;
  skip: number;
  take: number;
  page: number;
  perPage: number;
}

export interface TriageFeedbackData {
  status: FeedbackStatus;
  internalNote: string | null;
  reply: string | null;
  triagedById: string;
}

export interface FeedbackCounters {
  total: number;
  byStatus: Record<FeedbackStatus, number>;
  byKind: Record<FeedbackKind, number>;
}

export abstract class IFeedbackRepository {
  abstract create(data: CreateFeedbackData): Promise<FeedbackEntity>;

  abstract findById(id: string): Promise<FeedbackEntity | null>;

  abstract list(filter: ListFeedbacksFilter): Promise<Page<FeedbackEntity>>;

  abstract triage(
    id: string,
    data: TriageFeedbackData,
  ): Promise<FeedbackEntity>;

  abstract counters(companyId?: string): Promise<FeedbackCounters>;
}
