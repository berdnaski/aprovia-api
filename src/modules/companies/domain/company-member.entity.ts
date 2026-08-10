import { CompanyMemberRole } from "generated/prisma/enums";

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
}