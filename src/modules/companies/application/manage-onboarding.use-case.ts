import { Injectable } from '@nestjs/common';
import { ApproverType, OnboardingStep } from 'generated/prisma/enums';
import { IApprovalRuleRepository } from 'src/modules/approval-rules/domain/approval-rules.repository.interface';
import { ICostCenterRepository } from 'src/modules/cost-centers/domain/cost-centers.repository.interface';
import { CompanyEntity } from '../domain/company.entity';
import { ICompanyRepository } from '../domain/companies.repository.interface';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import { OnboardingIncompleteError } from '../domain/companies.errors';
import {
  buildStatus,
  furthestStep,
  OnboardingStatus,
} from '../domain/onboarding';
import { FindCompanyByIdUseCase } from './find-company-by-id.use-case';

const GLOBAL_TIER = { costCenterId: null, categoryId: null };

const DEFAULT_MATRIX = [
  {
    minAmountCents: 0n,
    maxAmountCents: 500000n,
    approverType: ApproverType.DIRECT_MANAGER,
    requiresDualApproval: false,
  },
  {
    minAmountCents: 500001n,
    maxAmountCents: 5000000n,
    approverType: ApproverType.COST_CENTER_MANAGER,
    requiresDualApproval: false,
  },
  {
    minAmountCents: 5000001n,
    maxAmountCents: null,
    approverType: ApproverType.COST_CENTER_MANAGER,
    requiresDualApproval: true,
  },
];

@Injectable()
export class ManageOnboardingUseCase {
  constructor(
    private readonly companyRepository: ICompanyRepository,
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly costCenterRepository: ICostCenterRepository,
    private readonly approvalRuleRepository: IApprovalRuleRepository,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
  ) {}

  async status(companyId: string): Promise<OnboardingStatus> {
    const company = await this.findCompanyByIdUseCase.execute(companyId);

    const [costCenters, rules, members] = await Promise.all([
      this.costCenterRepository.list(companyId),
      this.approvalRuleRepository.listByCompany(companyId),
      this.companyMemberRepository.list(companyId),
    ]);

    return buildStatus(company.onboardingStep, company.onboardingCompletedAt, {
      costCenterWithManager: costCenters.some(
        (costCenter) => !costCenter.disabledAt && costCenter.managerId,
      ),
      approvalMatrix: rules.length > 0,
      team: members.length > 1,
    });
  }

  async advance(
    companyId: string,
    step: OnboardingStep,
  ): Promise<OnboardingStatus> {
    const company = await this.findCompanyByIdUseCase.execute(companyId);

    if (company.onboardingCompletedAt) {
      return this.status(companyId);
    }

    await this.companyRepository.advanceOnboarding(
      companyId,
      furthestStep(company.onboardingStep, step),
    );

    return this.status(companyId);
  }

  async complete(companyId: string): Promise<CompanyEntity> {
    const rules = await this.approvalRuleRepository.listByCompany(companyId);

    if (rules.length === 0) {
      await this.approvalRuleRepository.createMany(
        companyId,
        GLOBAL_TIER,
        DEFAULT_MATRIX,
      );
    }

    const status = await this.status(companyId);

    if (!status.canComplete) {
      throw new OnboardingIncompleteError(
        status.requirements
          .filter((requirement) => requirement.required && !requirement.done)
          .map((requirement) => requirement.label),
      );
    }

    return this.companyRepository.completeOnboarding(companyId);
  }
}
