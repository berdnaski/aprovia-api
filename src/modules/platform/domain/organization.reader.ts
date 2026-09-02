import { OnboardingStep } from 'generated/prisma/enums';
import { Page } from 'src/shared/dto/pagination-query.dto';

export interface OrganizationRecord {
  companyId: string;
  legalName: string;
  tradeName: string | null;
  cnpj: string;
  onboardingStep: OnboardingStep;
  disabledAt: Date | null;
  createdAt: Date;
}

export interface ListOrganizationsFilter {
  search?: string;
  skip: number;
  take: number;
}

export abstract class IOrganizationReader {
  abstract list(
    filter: ListOrganizationsFilter,
  ): Promise<Page<OrganizationRecord>>;

  abstract findById(companyId: string): Promise<OrganizationRecord | null>;
}
