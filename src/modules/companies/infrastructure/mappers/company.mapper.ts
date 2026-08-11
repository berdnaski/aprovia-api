import { CompanyEntity } from '../../domain/company.entity';
import { CompanyModel as PrismaCompany } from 'generated/prisma/models';

export class CompanyMapper {
  static toDomain(raw: PrismaCompany): CompanyEntity {
    const entity = new CompanyEntity();

    entity.id = raw.id;
    entity.legalName = raw.legal_name;
    entity.tradeName = raw.trade_name;
    entity.cnpj = raw.cnpj;
    entity.industry = raw.industry;
    entity.companySize = raw.company_size;
    entity.onboardingStep = raw.onboarding_step;
    entity.onboardingCompletedAt = raw.onboarding_completed_at;
    entity.overrunTolerancePercent = raw.overrun_tolerance_percent.toNumber();
    entity.reminderHours = raw.reminder_hours;
    entity.escalationHours = raw.escalation_hours;
    entity.dualApprovalThresholdCents = raw.dual_approval_threshold_cents;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;
    entity.disabledAt = raw.disabled_at;
    return entity;
  }

  static toPersistence(entity: CompanyEntity) {
    return {
      id: entity.id,
      legal_name: entity.legalName,
      trade_name: entity.tradeName,
      cnpj: entity.cnpj,
      industry: entity.industry,
      company_size: entity.companySize,
      onboarding_step: entity.onboardingStep,
      onboarding_completed_at: entity.onboardingCompletedAt,
      overrun_tolerance_percent: entity.overrunTolerancePercent,
      reminder_hours: entity.reminderHours,
      escalation_hours: entity.escalationHours,
      dual_approval_threshold_cents: entity.dualApprovalThresholdCents,
    };
  }
}
