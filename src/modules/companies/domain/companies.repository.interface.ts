import { OnboardingStep } from 'generated/prisma/enums';
import { CompanyMemberEntity } from './company-member.entity';
import { CompanyEntity } from './company.entity';

export interface CreateCompanyData {
  ownerId: string;
  legalName: string;
  tradeName?: string | null;
  cnpj: string;
  industry?: string | null;
  companySize?: string | null;
  categories: ReadonlyArray<{ name: string; description: string }>;
}

export interface UpdateCompanyData {
  legalName?: string;
  tradeName?: string | null;
  industry?: string | null;
  companySize?: string | null;
}

export interface UpdateCompanyPolicyData {
  overrunTolerancePercent?: number;
  reminderHours?: number;
  escalationHours?: number;
  dualApprovalThresholdCents?: bigint | null;
  priceTolerancePercent?: number;
  quantityTolerancePercent?: number;
  requiresReceiptBeforeInvoice?: boolean;
  autoReleaseOnMatch?: boolean;
  matchRequiredAboveCents?: bigint | null;
  poNumberPrefix?: string;
}

export interface CreatedCompany {
  company: CompanyEntity;
  owner: CompanyMemberEntity;
}

export abstract class ICompanyRepository {
  abstract create(data: CreateCompanyData): Promise<CreatedCompany>;

  abstract findById(id: string): Promise<CompanyEntity | null>;

  abstract findByCnpj(cnpj: string): Promise<CompanyEntity | null>;

  abstract update(id: string, data: UpdateCompanyData): Promise<CompanyEntity>;

  abstract updatePolicy(
    id: string,
    data: UpdateCompanyPolicyData,
  ): Promise<CompanyEntity>;

  abstract advanceOnboarding(
    id: string,
    step: OnboardingStep,
  ): Promise<CompanyEntity>;

  abstract completeOnboarding(id: string): Promise<CompanyEntity>;
}
