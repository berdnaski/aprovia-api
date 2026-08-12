import { Injectable } from '@nestjs/common';
import { AuditEventType } from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import { ApprovalRuleEntity } from '../domain/approval-rule.entity';
import {
  ApprovalRuleRangeData,
  ApprovalRuleTier,
  IApprovalRuleRepository,
} from '../domain/approval-rules.repository.interface';
import { ApprovalMatrixService } from '../domain/services/approval-matrix.service';
import { ReplaceApprovalMatrixDto } from '../dto/replace-approval-matrix.dto';

@Injectable()
export class ReplaceApprovalMatrixUseCase {
  constructor(
    private readonly approvalRuleRepository: IApprovalRuleRepository,
    private readonly approvalMatrixService: ApprovalMatrixService,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    companyId: string,
    data: ReplaceApprovalMatrixDto,
    actorUserId: string | null = null,
  ): Promise<ApprovalRuleEntity[]> {
    const tier: ApprovalRuleTier = {
      costCenterId: data.costCenterId ?? null,
      categoryId: data.categoryId ?? null,
    };

    if (tier.costCenterId) {
      await this.findCostCenterByIdUseCase.execute(
        tier.costCenterId,
        companyId,
      );
    }

    const isGlobalTier = tier.costCenterId === null && tier.categoryId === null;

    const ranges: ApprovalRuleRangeData[] = data.ranges.map((range) => ({
      minAmountCents: range.minAmountCents,
      maxAmountCents: range.maxAmountCents ?? null,
      approverType: range.approverType,
      requiresDualApproval: range.requiresDualApproval ?? false,
    }));

    const sorted =
      ranges.length === 0 && !isGlobalTier
        ? []
        : this.approvalMatrixService.assertCoherent(ranges);

    return this.transactionManager.run(async (context) => {
      await this.approvalRuleRepository.deleteTier(companyId, tier, context);

      if (sorted.length > 0) {
        await this.approvalRuleRepository.createMany(
          companyId,
          tier,
          sorted,
          context,
        );
      }

      await this.auditLogRepository.record(
        {
          companyId,
          actorId: actorUserId,
          eventType: AuditEventType.RULES_CHANGED,
          entityType: AuditEntity.APPROVAL_RULE,
          entityId: `${tier.costCenterId ?? 'global'}:${tier.categoryId ?? 'global'}`,
          newData: { ranges: sorted.length },
        },
        context,
      );

      return this.approvalRuleRepository.listByTier(companyId, tier, context);
    });
  }
}
