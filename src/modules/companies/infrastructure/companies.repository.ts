import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import {
  CreatedCompany,
  CreateCompanyData,
  ICompanyRepository,
  UpdateCompanyData,
  UpdateCompanyPolicyData,
} from '../domain/companies.repository.interface';
import { CompanyEntity } from '../domain/company.entity';
import { CompanyMemberMapper } from './mappers/company-member.mapper';
import { CompanyMapper } from './mappers/company.mapper';
import { CompanyMemberRole, OnboardingStep } from 'generated/prisma/enums';

@Injectable()
export class CompanyRepository implements ICompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCompanyData): Promise<CreatedCompany> {
    const raw = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          legal_name: data.legalName,
          trade_name: data.tradeName,
          cnpj: data.cnpj,
          industry: data.industry,
          company_size: data.companySize,
        },
      });

      const owner = await tx.companyMember.create({
        data: {
          user_id: data.ownerId,
          company_id: company.id,
          role: CompanyMemberRole.FINANCE_ADMIN,
        },
      });

      await tx.category.createMany({
        data: data.categories.map((category) => ({
          company_id: company.id,
          name: category.name,
          description: category.description,
        })),
      });

      return { company, owner };
    });

    return {
      company: CompanyMapper.toDomain(raw.company),
      owner: CompanyMemberMapper.toDomain(raw.owner),
    };
  }

  async findById(id: string): Promise<CompanyEntity | null> {
    const raw = await this.prisma.company.findUnique({
      where: {
        id,
      },
    });

    return raw ? CompanyMapper.toDomain(raw) : null;
  }

  async findByCnpj(cnpj: string): Promise<CompanyEntity | null> {
    const raw = await this.prisma.company.findUnique({
      where: {
        cnpj,
      },
    });
    return raw ? CompanyMapper.toDomain(raw) : null;
  }

  async update(id: string, data: UpdateCompanyData): Promise<CompanyEntity> {
    const raw = await this.prisma.company.update({
      where: {
        id,
      },
      data: {
        legal_name: data.legalName,
        trade_name: data.tradeName,
        industry: data.industry,
        company_size: data.companySize,
      },
    });
    return CompanyMapper.toDomain(raw);
  }

  async updatePolicy(
    id: string,
    data: UpdateCompanyPolicyData,
  ): Promise<CompanyEntity> {
    const raw = await this.prisma.company.update({
      where: {
        id,
      },
      data: {
        overrun_tolerance_percent: data.overrunTolerancePercent,
        reminder_hours: data.reminderHours,
        escalation_hours: data.escalationHours,
        dual_approval_threshold_cents: data.dualApprovalThresholdCents,
      },
    });
    return CompanyMapper.toDomain(raw);
  }

  async advanceOnboarding(
    id: string,
    step: OnboardingStep,
  ): Promise<CompanyEntity> {
    const raw = await this.prisma.company.update({
      where: {
        id,
      },
      data: {
        onboarding_step: step,
      },
    });
    return CompanyMapper.toDomain(raw);
  }

  async completeOnboarding(id: string): Promise<CompanyEntity> {
    const raw = await this.prisma.company.update({
      where: { id },
      data: {
        onboarding_step: OnboardingStep.DONE,
        onboarding_completed_at: new Date(),
      },
    });
    return CompanyMapper.toDomain(raw);
  }
}
