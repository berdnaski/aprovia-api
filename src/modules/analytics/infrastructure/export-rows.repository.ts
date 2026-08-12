import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { VisibilityScope } from 'src/modules/purchase-requests/domain/services/request-visibility.service';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import {
  ExportRequestRow,
  ExportRequestsFilter,
  IExportRowsRepository,
} from '../domain/export-rows.repository.interface';
import { ExportRowMapper } from './mappers/export-row.mapper';

function buildWhere(
  filter: ExportRequestsFilter,
): Prisma.PurchaseRequestWhereInput {
  const { visibility } = filter;
  const conditions: Prisma.PurchaseRequestWhereInput[] = [];

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
    created_at:
      filter.from || filter.to
        ? { gte: filter.from, lt: filter.to }
        : undefined,
    ...(conditions.length > 0 ? { AND: conditions } : {}),
  };
}

@Injectable()
export class ExportRowsRepository implements IExportRowsRepository {
  constructor(private readonly prisma: PrismaService) {}

  countRequests(filter: ExportRequestsFilter): Promise<number> {
    return this.prisma.purchaseRequest.count({ where: buildWhere(filter) });
  }

  async listRequests(
    filter: ExportRequestsFilter,
  ): Promise<ExportRequestRow[]> {
    const records = await this.prisma.purchaseRequest.findMany({
      where: buildWhere(filter),
      orderBy: [{ created_at: 'desc' }, { number: 'desc' }],
      take: filter.limit,
      select: {
        number: true,
        status: true,
        title: true,
        total_amount_cents: true,
        created_at: true,
        submitted_at: true,
        finalized_at: true,
        cost_center: { select: { name: true } },
        category: { select: { name: true } },
        supplier: { select: { legal_name: true, cnpj: true } },
        requester: { select: { user: { select: { name: true } } } },
      },
    });

    return records.map(ExportRowMapper.toDomain);
  }
}
