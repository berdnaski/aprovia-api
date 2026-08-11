import { Injectable } from '@nestjs/common';
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
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    companyId: string,
    data: ReplaceApprovalMatrixDto,
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

      return this.approvalRuleRepository.listByTier(companyId, tier, context);
    });
  }
}
