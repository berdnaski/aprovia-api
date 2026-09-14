import { CompanyMemberRole } from 'generated/prisma/enums';

export function purchaseOrderScopeFor(
  role: CompanyMemberRole,
  memberId: string,
): string | undefined {
  return role === CompanyMemberRole.FINANCE_ADMIN ? undefined : memberId;
}
