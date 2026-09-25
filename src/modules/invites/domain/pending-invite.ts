import { CompanyMemberRole } from 'generated/prisma/enums';

export interface PendingInvite {
  id: string;
  companyName: string;
  role: CompanyMemberRole;
}
