import { ApprovalRuleModel as PrismaApprovalRule } from 'generated/prisma/models';
import { ApprovalRuleEntity } from '../../domain/approval-rule.entity';

export class ApprovalRuleMapper {
  static toDomain(this: void, raw: PrismaApprovalRule): ApprovalRuleEntity {
    const entity = new ApprovalRuleEntity();

    entity.id = raw.id;
    entity.companyId = raw.company_id;
    entity.costCenterId = raw.cost_center_id;
    entity.categoryId = raw.category_id;
    entity.minAmountCents = raw.min_amount_cents;
    entity.maxAmountCents = raw.max_amount_cents;
    entity.approverType = raw.approver_type;
    entity.requiresDualApproval = raw.requires_dual_approval;
    entity.isActive = raw.is_active;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;

    return entity;
  }
}
