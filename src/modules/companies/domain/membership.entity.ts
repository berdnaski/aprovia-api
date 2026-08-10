import { CompanyMemberRole } from 'generated/prisma/enums';

export class MembershipEntity {
  memberId: string;
  companyId: string;
  companyName: string;
  role: CompanyMemberRole;
}
