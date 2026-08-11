import { CompanyMemberRole } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { CompanyMemberEntity } from './company-member.entity';

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

export interface CountActiveAdminsOptions {
  excludeMemberId?: string;
}

export abstract class ICompanyMemberRepository {
  abstract create(data: CreateCompanyMemberData): Promise<CompanyMemberEntity>;
  abstract findById(
    id: string,
    context?: TransactionContext,
  ): Promise<CompanyMemberEntity | null>;
  abstract findActiveByUser(
    userId: string,
  ): Promise<CompanyMemberEntity | null>;
  abstract list(companyId: string): Promise<CompanyMemberEntity[]>;

  abstract countActiveAdmins(
    companyId: string,
    options?: CountActiveAdminsOptions,
    context?: TransactionContext,
  ): Promise<number>;

  abstract lockActiveAdmins(
    companyId: string,
    context: TransactionContext,
  ): Promise<void>;

  abstract listSubordinates(
    managerId: string,
    context?: TransactionContext,
  ): Promise<CompanyMemberEntity[]>;

  abstract listSubstitutedBy(
    substituteId: string,
    context?: TransactionContext,
  ): Promise<CompanyMemberEntity[]>;

  abstract reassignSubordinates(
    managerId: string,
    newManagerId: string | null,
    context?: TransactionContext,
  ): Promise<void>;

  abstract clearSubstituteReferences(
    substituteId: string,
    context?: TransactionContext,
  ): Promise<void>;

  abstract updateRole(
    id: string,
    role: CompanyMemberRole,
    context?: TransactionContext,
  ): Promise<CompanyMemberEntity>;

  abstract updateApprovalLimit(
    id: string,
    limitCents: bigint,
  ): Promise<CompanyMemberEntity>;

  abstract updateManager(
    id: string,
    managerId: string | null,
  ): Promise<CompanyMemberEntity>;

  abstract updateSubstitute(
    id: string,
    data: SubstituteData,
    context?: TransactionContext,
  ): Promise<CompanyMemberEntity>;

  abstract disable(id: string, context?: TransactionContext): Promise<void>;
}
