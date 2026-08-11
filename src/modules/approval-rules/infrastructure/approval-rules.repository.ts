import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { ApprovalRuleEntity } from '../domain/approval-rule.entity';
import {
  ApprovalRuleRangeData,
  ApprovalRuleTier,
  IApprovalRuleRepository,
  ListApprovalRulesFilter,
} from '../domain/approval-rules.repository.interface';
import { ApprovalRuleMapper } from './mappers/approval-rule.mapper';

@Injectable()
export class ApprovalRuleRepository implements IApprovalRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByCompany(
    companyId: string,
    filter?: ListApprovalRulesFilter,
    context?: TransactionContext,
  ): Promise<ApprovalRuleEntity[]> {
    const records = await prismaClient(
      this.prisma,
      context,
    ).approvalRule.findMany({
      where: {
        company_id: companyId,
        cost_center_id:
          filter?.costCenterId === undefined ? undefined : filter.costCenterId,
        category_id:
          filter?.categoryId === undefined ? undefined : filter.categoryId,
        is_active: true,
      },
      orderBy: [
        { cost_center_id: 'asc' },
        { category_id: 'asc' },
        { min_amount_cents: 'asc' },
      ],
    });

    return records.map(ApprovalRuleMapper.toDomain);
  }

  async listByTier(
    companyId: string,
    tier: ApprovalRuleTier,
    context?: TransactionContext,
  ): Promise<ApprovalRuleEntity[]> {
    const records = await prismaClient(
      this.prisma,
      context,
    ).approvalRule.findMany({
      where: {
        company_id: companyId,
        cost_center_id: tier.costCenterId,
        category_id: tier.categoryId,
      },
      orderBy: { min_amount_cents: 'asc' },
    });

    return records.map(ApprovalRuleMapper.toDomain);
  }

  async deleteTier(
    companyId: string,
    tier: ApprovalRuleTier,
    context?: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).approvalRule.deleteMany({
      where: {
        company_id: companyId,
        cost_center_id: tier.costCenterId,
        category_id: tier.categoryId,
      },
    });
  }

  async createMany(
    companyId: string,
    tier: ApprovalRuleTier,
    ranges: ApprovalRuleRangeData[],
    context?: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).approvalRule.createMany({
      data: ranges.map((range) => ({
        company_id: companyId,
        cost_center_id: tier.costCenterId,
        category_id: tier.categoryId,
        min_amount_cents: range.minAmountCents,
        max_amount_cents: range.maxAmountCents,
        approver_type: range.approverType,
        requires_dual_approval: range.requiresDualApproval,
      })),
    });
  }
}
