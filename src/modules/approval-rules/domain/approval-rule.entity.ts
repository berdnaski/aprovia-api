import { ApproverType } from 'generated/prisma/enums';

export class ApprovalRuleEntity {
  id: string;
  companyId: string;
  costCenterId: string | null;
  categoryId: string | null;
  minAmountCents: bigint;
  maxAmountCents: bigint | null;
  approverType: ApproverType;
  requiresDualApproval: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
