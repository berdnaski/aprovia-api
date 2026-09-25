import { CompanyMemberRole } from 'generated/prisma/enums';

export interface RoutingMember {
  id: string;
  role: CompanyMemberRole;
  approvalLimitCents: bigint;
  costCenterId: string | null;
  absentFrom: Date | null;
  absentUntil: Date | null;
  substituteId: string | null;
  disabled: boolean;
}

export interface RoutingCostCenter {
  id: string;
}

export interface RoutingRule {
  id: string;
  costCenterId: string | null;
  categoryId: string | null;
  minAmountCents: bigint;
  maxAmountCents: bigint | null;
  requiresDualApproval: boolean;
  isActive: boolean;
}

export interface RoutingInput {
  amountCents: bigint;
  requester: RoutingMember;
  costCenter: RoutingCostCenter;
  categoryId: string | null;
  members: RoutingMember[];
  rules: RoutingRule[];
  dualApprovalThresholdCents: bigint | null;
  at: Date;
}

export interface RoutingStep {
  stepOrder: number;
  expectedApproverId: string;
  onBehalfOfId: string | null;
  requiresDualApproval: boolean;
}

export interface RoutingResult {
  ruleId: string;
  steps: RoutingStep[];
}
