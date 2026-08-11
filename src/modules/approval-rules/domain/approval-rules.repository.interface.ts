import { ApproverType } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { ApprovalRuleEntity } from './approval-rule.entity';

export interface ApprovalRuleTier {
  costCenterId: string | null;
  categoryId: string | null;
}

export interface ApprovalRuleRangeData {
  minAmountCents: bigint;
  maxAmountCents: bigint | null;
  approverType: ApproverType;
  requiresDualApproval: boolean;
}

export interface ListApprovalRulesFilter {
  costCenterId?: string | null;
  categoryId?: string | null;
}

export abstract class IApprovalRuleRepository {
  abstract listByCompany(
    companyId: string,
    filter?: ListApprovalRulesFilter,
    context?: TransactionContext,
  ): Promise<ApprovalRuleEntity[]>;

  abstract listByTier(
    companyId: string,
    tier: ApprovalRuleTier,
    context?: TransactionContext,
  ): Promise<ApprovalRuleEntity[]>;

  abstract deleteTier(
    companyId: string,
    tier: ApprovalRuleTier,
    context?: TransactionContext,
  ): Promise<void>;

  abstract createMany(
    companyId: string,
    tier: ApprovalRuleTier,
    ranges: ApprovalRuleRangeData[],
    context?: TransactionContext,
  ): Promise<void>;
}
