import { CompanyModel as PrismaCompany } from 'generated/prisma/models';
import { OrganizationRecord } from '../../domain/organization.reader';

export class OrganizationMapper {
  static toDomain(this: void, raw: PrismaCompany): OrganizationRecord {
    return {
      companyId: raw.id,
      legalName: raw.legal_name,
      tradeName: raw.trade_name,
      cnpj: raw.cnpj,
      onboardingStep: raw.onboarding_step,
      disabledAt: raw.disabled_at,
      createdAt: raw.created_at,
    };
  }
}
