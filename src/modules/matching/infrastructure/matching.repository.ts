import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { MatchStatus } from 'generated/prisma/enums';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { MatchResultEntity } from '../domain/match-result.entity';
import {
  CreateMatchResultData,
  IMatchResultRepository,
  ListMatchResultsFilter,
} from '../domain/matching.repository.interface';
import { MatchResultMapper } from './mappers/match-result.mapper';

const INCLUDE = { divergences: true } as const;

@Injectable()
export class MatchResultRepository implements IMatchResultRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMatchResultData): Promise<MatchResultEntity> {
    const raw = await this.prisma.matchResult.create({
      data: {
        company_id: data.companyId,
        purchase_order_id: data.purchaseOrderId,
        invoice_id: data.invoiceId,
        status: data.status,
        price_tolerance_percent: data.priceTolerancePercent,
        quantity_tolerance_percent: data.quantityTolerancePercent,
        ordered_amount_cents: data.orderedAmountCents,
        received_amount_cents: data.receivedAmountCents,
        invoiced_amount_cents: data.invoicedAmountCents,
        divergences: {
          create: data.divergences.map((divergence) => ({
            kind: divergence.kind,
            purchase_order_item_id: divergence.purchaseOrderItemId,
            invoice_item_id: divergence.invoiceItemId,
            expected_value: divergence.expectedValue,
            actual_value: divergence.actualValue,
            difference_cents: divergence.differenceCents,
            difference_percent: divergence.differencePercent,
          })),
        },
      },
      include: INCLUDE,
    });

    return MatchResultMapper.toDomain(raw);
  }

  async findById(
    id: string,
    companyId: string,
  ): Promise<MatchResultEntity | null> {
    const raw = await this.prisma.matchResult.findFirst({
      where: { id, company_id: companyId },
      include: INCLUDE,
    });

    return raw ? MatchResultMapper.toDomain(raw) : null;
  }

  async list(filter: ListMatchResultsFilter): Promise<Page<MatchResultEntity>> {
    const where: Prisma.MatchResultWhereInput = {
      company_id: filter.companyId,
      ...(filter.status?.length && { status: { in: filter.status } }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.matchResult.findMany({
        where,
        include: INCLUDE,
        orderBy: { checked_at: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.matchResult.count({ where }),
    ]);

    return {
      items: rows.map(MatchResultMapper.toDomain),
      total,
      page: filter.page,
      perPage: filter.perPage,
    };
  }

  async resolve(
    id: string,
    resolvedById: string,
    status: MatchStatus,
    note: string,
  ): Promise<MatchResultEntity> {
    const raw = await this.prisma.matchResult.update({
      where: { id },
      data: {
        status,
        resolved_by_id: resolvedById,
        resolved_at: new Date(),
        resolution_note: note,
      },
      include: INCLUDE,
    });

    return MatchResultMapper.toDomain(raw);
  }
}
