import { CompanyMemberRole } from 'generated/prisma/enums';

export const VisibilityScope = {
  OWN: 'OWN',
  MANAGED_COST_CENTERS: 'MANAGED_COST_CENTERS',
  COMPANY_WIDE: 'COMPANY_WIDE',
} as const;

export type VisibilityScope =
  (typeof VisibilityScope)[keyof typeof VisibilityScope];

export interface RequestVisibility {
  scope: VisibilityScope;
  memberId: string;
  companyId: string;
}

export function resolveVisibility(
  memberId: string,
  companyId: string,
  role: CompanyMemberRole,
): RequestVisibility {
  if (role === CompanyMemberRole.FINANCE_ADMIN) {
    return { scope: VisibilityScope.COMPANY_WIDE, memberId, companyId };
  }

  if (role === CompanyMemberRole.APPROVER) {
    return { scope: VisibilityScope.MANAGED_COST_CENTERS, memberId, companyId };
  }

  return { scope: VisibilityScope.OWN, memberId, companyId };
}
