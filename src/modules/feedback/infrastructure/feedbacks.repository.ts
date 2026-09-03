import { Injectable } from '@nestjs/common';
import { FeedbackKind, FeedbackStatus, Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { FeedbackEntity } from '../domain/feedback.entity';
import {
  CreateFeedbackData,
  FeedbackCounters,
  IFeedbackRepository,
  ListFeedbacksFilter,
  TriageFeedbackData,
} from '../domain/feedbacks.repository.interface';
import { FeedbackMapper } from './mappers/feedback.mapper';

const PERSON = { select: { id: true, name: true, email: true } } as const;

const INCLUDE = {
  author: PERSON,
  triaged_by: PERSON,
  company: { select: { id: true, legal_name: true, trade_name: true } },
} as const;

function emptyBy<T extends string>(values: readonly T[]): Record<T, number> {
  return values.reduce(
    (acc, value) => ({ ...acc, [value]: 0 }),
    {} as Record<T, number>,
  );
}

@Injectable()
export class FeedbackRepository implements IFeedbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateFeedbackData): Promise<FeedbackEntity> {
    const raw = await this.prisma.feedback.create({
      data: {
        company_id: data.companyId,
        author_id: data.authorId,
        kind: data.kind,
        message: data.message,
        route: data.route,
        user_agent: data.userAgent,
        screenshot_storage_key: data.screenshotKey,
        screenshot_mime: data.screenshotMime,
        screenshot_size_bytes: data.screenshotSizeBytes,
      },
      include: INCLUDE,
    });

    return FeedbackMapper.toDomain(raw);
  }

  async findById(id: string): Promise<FeedbackEntity | null> {
    const raw = await this.prisma.feedback.findUnique({
      where: { id },
      include: INCLUDE,
    });

    return raw ? FeedbackMapper.toDomain(raw) : null;
  }

  async list(filter: ListFeedbacksFilter): Promise<Page<FeedbackEntity>> {
    const where: Prisma.FeedbackWhereInput = {
      ...(filter.companyId && { company_id: filter.companyId }),
      ...(filter.authorId && { author_id: filter.authorId }),
      ...(filter.status?.length && { status: { in: filter.status } }),
      ...(filter.kind?.length && { kind: { in: filter.kind } }),
      ...(filter.search && {
        message: { contains: filter.search, mode: 'insensitive' as const },
      }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        include: INCLUDE,
        orderBy: { created_at: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return {
      items: rows.map(FeedbackMapper.toDomain),
      total,
      page: filter.page,
      perPage: filter.perPage,
    };
  }

  async triage(id: string, data: TriageFeedbackData): Promise<FeedbackEntity> {
    const raw = await this.prisma.feedback.update({
      where: { id },
      data: {
        status: data.status,
        internal_note: data.internalNote,
        reply: data.reply,
        replied_at: data.reply ? new Date() : undefined,
        triaged_by_id: data.triagedById,
        triaged_at: new Date(),
      },
      include: INCLUDE,
    });

    return FeedbackMapper.toDomain(raw);
  }

  async counters(companyId?: string): Promise<FeedbackCounters> {
    const where: Prisma.FeedbackWhereInput = companyId
      ? { company_id: companyId }
      : {};

    const [byStatus, byKind] = await Promise.all([
      this.prisma.feedback.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.feedback.groupBy({
        by: ['kind'],
        where,
        _count: { _all: true },
      }),
    ]);

    const status = emptyBy(Object.values(FeedbackStatus));
    const kind = emptyBy(Object.values(FeedbackKind));

    for (const row of byStatus) {
      status[row.status] = row._count._all;
    }

    for (const row of byKind) {
      kind[row.kind] = row._count._all;
    }

    return {
      total: byStatus.reduce((sum, row) => sum + row._count._all, 0),
      byStatus: status,
      byKind: kind,
    };
  }
}
