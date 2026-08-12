import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { PurchaseRequestEntity } from '../domain/purchase-request.entity';
import {
  CreatePurchaseRequestData,
  FindSimilarInput,
  MarkSubmittedData,
  FinalizeData,
  CancelData,
  IPurchaseRequestRepository,
  ListRequestsFilter,
  UpdatePurchaseRequestData,
} from '../domain/purchase-requests.repository.interface';
import { VisibilityScope } from '../domain/services/request-visibility.service';
import { PurchaseRequestMapper } from './mappers/purchase-request.mapper';

@Injectable()
export class PurchaseRequestRepository implements IPurchaseRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreatePurchaseRequestData,
    context?: TransactionContext,
  ): Promise<PurchaseRequestEntity> {
    const raw = await prismaClient(this.prisma, context).purchaseRequest.create(
      {
        data: {
          company_id: data.companyId,
          number: data.number,
          requester_id: data.requesterId,
          cost_center_id: data.costCenterId,
          category_id: data.categoryId,
          supplier_id: data.supplierId,
          title: data.title,
          description: data.description,
          urgency: data.urgency,
          payment_terms: data.paymentTerms,
          total_amount_cents: 0n,
        },
      },
    );

    return PurchaseRequestMapper.toDomain(raw);
  }

  async findRecentSimilar(
    input: FindSimilarInput,
  ): Promise<PurchaseRequestEntity[]> {
    const delta = (input.amountCents * input.tolerancePercent) / 100n;

    const records = await this.prisma.purchaseRequest.findMany({
      where: {
        company_id: input.companyId,
        requester_id: input.requesterId,
        supplier_id: input.supplierId,
        id: { not: input.excludeRequestId },
        created_at: { gte: input.since },
        status: { not: 'CANCELED' },
        total_amount_cents: {
          gte: input.amountCents - delta,
          lte: input.amountCents + delta,
        },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    return records.map(PurchaseRequestMapper.toDomain);
  }

  async markSubmitted(
    id: string,
    data: MarkSubmittedData,
    context?: TransactionContext,
  ): Promise<PurchaseRequestEntity> {
    const raw = await prismaClient(this.prisma, context).purchaseRequest.update(
      {
        where: { id },
        data: {
          total_amount_cents: data.totalAmountCents,
          submitted_at: data.submittedAt,
          requires_override: data.requiresOverride,
          status: data.status,
        },
      },
    );

    return PurchaseRequestMapper.toDomain(raw);
  }

  async finalize(
    id: string,
    data: FinalizeData,
    context?: TransactionContext,
  ): Promise<PurchaseRequestEntity> {
    const raw = await prismaClient(this.prisma, context).purchaseRequest.update(
      {
        where: { id },
        data: { status: data.status, finalized_at: data.finalizedAt },
      },
    );

    return PurchaseRequestMapper.toDomain(raw);
  }

  async cancel(
    id: string,
    data: CancelData,
    context?: TransactionContext,
  ): Promise<PurchaseRequestEntity> {
    const raw = await prismaClient(this.prisma, context).purchaseRequest.update(
      {
        where: { id },
        data: {
          status: 'CANCELED',
          finalized_at: new Date(),
          canceled_by_id: data.canceledById,
          cancel_reason: data.cancelReason,
        },
      },
    );

    return PurchaseRequestMapper.toDomain(raw);
  }

  async findById(
    id: string,
    context?: TransactionContext,
  ): Promise<PurchaseRequestEntity | null> {
    const raw = await prismaClient(
      this.prisma,
      context,
    ).purchaseRequest.findUnique({ where: { id } });

    return raw ? PurchaseRequestMapper.toDomain(raw) : null;
  }

  async findLastNumber(
    companyId: string,
    prefix: string,
    context?: TransactionContext,
  ): Promise<string | null> {
    const raw = await prismaClient(
      this.prisma,
      context,
    ).purchaseRequest.findFirst({
      where: { company_id: companyId, number: { startsWith: prefix } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    return raw?.number ?? null;
  }

  private buildWhere(
    filter: ListRequestsFilter,
  ): Prisma.PurchaseRequestWhereInput {
    const { visibility } = filter;
    const conditions: Prisma.PurchaseRequestWhereInput[] = [];

    if (filter.search) {
      conditions.push({
        OR: [
          { number: { contains: filter.search, mode: 'insensitive' } },
          { title: { contains: filter.search, mode: 'insensitive' } },
        ],
      });
    }

    if (visibility.scope === VisibilityScope.OWN) {
      conditions.push({ requester_id: visibility.memberId });
    }

    if (visibility.scope === VisibilityScope.MANAGED_COST_CENTERS) {
      conditions.push({
        OR: [
          { requester_id: visibility.memberId },
          { cost_center: { manager_id: visibility.memberId } },
          {
            approval_steps: {
              some: { expected_approver_id: visibility.memberId },
            },
          },
        ],
      });
    }

    return {
      company_id: visibility.companyId,
      status: filter.status ? { in: filter.status } : undefined,
      cost_center_id: filter.costCenterId,
      supplier_id: filter.supplierId,
      category_id: filter.categoryId,
      ...(conditions.length > 0 ? { AND: conditions } : {}),
    };
  }

  async list(filter: ListRequestsFilter): Promise<Page<PurchaseRequestEntity>> {
    const where = this.buildWhere(filter);

    const [records, total] = await Promise.all([
      this.prisma.purchaseRequest.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);

    return {
      items: records.map(PurchaseRequestMapper.toDomain),
      total,
      page: Math.floor(filter.skip / filter.take) + 1,
      perPage: filter.take,
    };
  }

  async listManagedCostCenterIds(
    memberId: string,
    companyId: string,
  ): Promise<string[]> {
    const records = await this.prisma.costCenter.findMany({
      where: { company_id: companyId, manager_id: memberId },
      select: { id: true },
    });

    return records.map((record) => record.id);
  }

  async update(
    id: string,
    data: UpdatePurchaseRequestData,
    context?: TransactionContext,
  ): Promise<PurchaseRequestEntity> {
    const raw = await prismaClient(this.prisma, context).purchaseRequest.update(
      {
        where: { id },
        data: {
          cost_center_id: data.costCenterId,
          category_id: data.categoryId,
          supplier_id: data.supplierId,
          title: data.title,
          description: data.description,
          urgency: data.urgency,
          payment_terms: data.paymentTerms,
        },
      },
    );

    return PurchaseRequestMapper.toDomain(raw);
  }

  async updateTotal(
    id: string,
    totalAmountCents: bigint,
    context?: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).purchaseRequest.update({
      where: { id },
      data: { total_amount_cents: totalAmountCents },
    });
  }

  async delete(id: string, context?: TransactionContext): Promise<void> {
    await prismaClient(this.prisma, context).purchaseRequest.delete({
      where: { id },
    });
  }
}
