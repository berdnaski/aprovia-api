import { ApproverType } from 'generated/prisma/enums';

export interface RoutingMember {
  id: string;
  approvalLimitCents: bigint;
  managerId: string | null;
  absentFrom: Date | null;
  absentUntil: Date | null;
  substituteId: string | null;
}

export interface RoutingCostCenter {
  id: string;
  managerId: string;
}

export interface RoutingRule {
  id: string;
  costCenterId: string | null;
  categoryId: string | null;
  minAmountCents: bigint;
  maxAmountCents: bigint | null;
  approverType: ApproverType;
  requiresDualApproval: boolean;
  isActive: boolean;
}

export interface RoutingInput {
  amountCents: bigint;
  requester: RoutingMember;
  costCenter: RoutingCostCenter;
  categoryId: string | null;
  hierarchy: RoutingMember[];
  rules: RoutingRule[];
  dualApprovalThresholdCents: bigint | null;
  financeAdmins: RoutingMember[];
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
