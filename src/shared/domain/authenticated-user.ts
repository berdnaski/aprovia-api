import { CompanyMemberRole } from "generated/prisma/enums";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  emailVerified: boolean;
  isSuperAdmin: boolean;
  companyId?: string;
  memberId?: string;
  role?: CompanyMemberRole;
}
