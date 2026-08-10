import { CompanyMemberRole } from "generated/prisma/enums";
import { CompanyMemberEntity } from "./company-member.entity";

export interface CreateCompanyMemberData {
  userId: string;
  companyId: string;
  role: CompanyMemberRole;
  approvalLimitCents?: bigint;
  defaultCostCenterId?: string | null;
  managerId?: string | null;
}

export interface SubstituteData {
  substituteId: string | null;
  absentFrom: Date | null;
  absentUntil: Date | null;
}

export abstract class ICompanyMemberRepository {
  abstract create(data: CreateCompanyMemberData): Promise<CompanyMemberEntity>;
  abstract findById(id: string): Promise<CompanyMemberEntity | null>;
  abstract findActiveByUser(userId: string): Promise<CompanyMemberEntity | null>;
  abstract list(companyId: string): Promise<CompanyMemberEntity[]>;
  abstract countActiveAdmins(companyId: string): Promise<number>;

  abstract updateRole(id: string, role: CompanyMemberRole): Promise<CompanyMemberEntity>;
  abstract updateApprovalLimit(id: string, limitCents: bigint): Promise<CompanyMemberEntity>;
  abstract updateManager(id: string, managerId: string | null): Promise<CompanyMemberEntity>;
  abstract updateSubstitute(id: string, data: SubstituteData): Promise<CompanyMemberEntity>;
  abstract disable(id: string): Promise<void>;
}
