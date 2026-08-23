import { CompanyMemberRole } from 'generated/prisma/enums';

export class CompanyMemberUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export class CompanyMemberEntity {
  id: string;
  userId: string;
  companyId: string;
  role: CompanyMemberRole;
  approvalLimitCents: bigint;
  defaultCostCenterId: string | null;
  managerId: string | null;
  absentFrom: Date | null;
  absentUntil: Date | null;
  substituteId: string | null;
  createdAt: Date;
  updatedAt: Date;
  disabledAt: Date | null;
  user?: CompanyMemberUser;
}
