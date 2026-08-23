import { Injectable } from '@nestjs/common';
import { RequestStatus } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { CostCenterEntity } from '../domain/cost-center.entity';
import {
  CostCenterUsage,
  CreateCostCenterData,
  ICostCenterRepository,
  ListCostCentersFilter,
  UpdateCostCenterData,
} from '../domain/cost-centers.repository.interface';
import { CostCenterMapper } from './mappers/cost-center.mapper';

const OPEN_REQUEST_STATUSES: RequestStatus[] = [
  RequestStatus.DRAFT,
  RequestStatus.PENDING,
  RequestStatus.CHANGES_REQUESTED,
  RequestStatus.APPROVED,
];

@Injectable()
export class CostCenterRepository implements ICostCenterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateCostCenterData,
    context?: TransactionContext,
  ): Promise<CostCenterEntity> {
    const raw = await prismaClient(this.prisma, context).costCenter.create({
      data: {
        company_id: data.companyId,
        name: data.name,
        code: data.code,
        manager_id: data.managerId,
        parent_id: data.parentId,
      },
    });

    return CostCenterMapper.toDomain(raw);
  }

  async findById(
    id: string,
    context?: TransactionContext,
  ): Promise<CostCenterEntity | null> {
    const raw = await prismaClient(this.prisma, context).costCenter.findUnique({
      where: { id },
    });

    return raw ? CostCenterMapper.toDomain(raw) : null;
  }

  async list(
    companyId: string,
    filter?: ListCostCentersFilter,
  ): Promise<CostCenterEntity[]> {
    const search = filter?.search?.trim();

    const records = await this.prisma.costCenter.findMany({
      where: {
        company_id: companyId,
        disabled_at: filter?.includeDisabled ? undefined : null,
        parent_id: filter?.parentId === undefined ? undefined : filter.parentId,
        manager_id: filter?.managerId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { code: { contains: search, mode: 'insensitive' as const } },
                {
                  manager: {
                    user: {
                      name: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });

    return records.map(CostCenterMapper.toDomain);
  }

  async listManagedBy(
    managerId: string,
    context?: TransactionContext,
  ): Promise<CostCenterEntity[]> {
    const records = await prismaClient(
      this.prisma,
      context,
    ).costCenter.findMany({
      where: { manager_id: managerId, disabled_at: null },
      orderBy: { name: 'asc' },
    });

    return records.map(CostCenterMapper.toDomain);
  }

  countActiveChildren(
    parentId: string,
    context?: TransactionContext,
  ): Promise<number> {
    return prismaClient(this.prisma, context).costCenter.count({
      where: { parent_id: parentId, disabled_at: null },
    });
  }

  async findUsage(
    id: string,
    context?: TransactionContext,
  ): Promise<CostCenterUsage> {
    const db = prismaClient(this.prisma, context);

    const [
      purchaseRequests,
      budgets,
      linkedMembers,
      children,
      defaultOfMembers,
      approvalRules,
    ] = await Promise.all([
      db.purchaseRequest.count({
        where: { cost_center_id: id, status: { in: OPEN_REQUEST_STATUSES } },
      }),
      db.budget.count({ where: { cost_center_id: id } }),
      db.costCenterMember.count({ where: { cost_center_id: id } }),
      db.costCenter.count({ where: { parent_id: id } }),
      db.companyMember.count({ where: { default_cost_center_id: id } }),
      db.approvalRule.count({ where: { cost_center_id: id } }),
    ]);

    return {
      purchaseRequests,
      budgets,
      linkedMembers,
      children,
      defaultOfMembers,
      approvalRules,
    };
  }

  async update(
    id: string,
    data: UpdateCostCenterData,
    context?: TransactionContext,
  ): Promise<CostCenterEntity> {
    const raw = await prismaClient(this.prisma, context).costCenter.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        manager_id: data.managerId,
        parent_id: data.parentId,
      },
    });

    return CostCenterMapper.toDomain(raw);
  }

  async disable(id: string, context?: TransactionContext): Promise<void> {
    await prismaClient(this.prisma, context).costCenter.update({
      where: { id },
      data: { disabled_at: new Date() },
    });
  }

  async delete(id: string, context?: TransactionContext): Promise<void> {
    await prismaClient(this.prisma, context).costCenter.delete({
      where: { id },
    });
  }

  async reassignManager(
    fromManagerId: string,
    toManagerId: string,
    context?: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).costCenter.updateMany({
      where: { manager_id: fromManagerId, disabled_at: null },
      data: { manager_id: toManagerId },
    });
  }
}
