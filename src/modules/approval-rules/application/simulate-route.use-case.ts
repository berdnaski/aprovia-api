import { Injectable } from '@nestjs/common';
import { CompanyMemberEntity } from 'src/modules/companies/domain/company-member.entity';
import { FindCompanyByIdUseCase } from 'src/modules/companies/application/find-company-by-id.use-case';
import { ICompanyMemberRepository } from 'src/modules/companies/domain/company-members.repository.interface';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { IApprovalRuleRepository } from '../domain/approval-rules.repository.interface';
import { ApprovalRoutingService } from '../domain/routing/approval-routing.service';
import {
  RoutingInput,
  RoutingMember,
  RoutingResult,
} from '../domain/routing/routing.types';
import { SimulateRouteDto } from '../dto/simulate-route.dto';

const routing = new ApprovalRoutingService();

@Injectable()
export class SimulateRouteUseCase {
  constructor(
    private readonly approvalRuleRepository: IApprovalRuleRepository,
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
  ) {}

  async execute(
    companyId: string,
    data: SimulateRouteDto,
  ): Promise<RoutingResult> {
    const [costCenter, company, members, rules] = await Promise.all([
      this.findCostCenterByIdUseCase.execute(data.costCenterId, companyId),
      this.findCompanyByIdUseCase.execute(companyId),
      this.companyMemberRepository.list(companyId),
      this.approvalRuleRepository.listByCompany(companyId),
    ]);

    const requester = members.find((member) => member.id === data.requesterId);

    if (!requester) {
      throw new NotFoundError('Membro', data.requesterId);
    }

    const toRoutingMember = (member: CompanyMemberEntity): RoutingMember => ({
      id: member.id,
      role: member.role,
      approvalLimitCents: member.approvalLimitCents,
      costCenterId: member.defaultCostCenterId,
      absentFrom: member.absentFrom,
      absentUntil: member.absentUntil,
      substituteId: member.substituteId,
      disabled: member.disabledAt !== null,
    });

    const input: RoutingInput = {
      amountCents: data.amountCents,
      requester: toRoutingMember(requester),
      costCenter: { id: costCenter.id },
      categoryId: data.categoryId ?? null,
      members: members.map(toRoutingMember),
      rules: rules.map((rule) => ({
        id: rule.id,
        costCenterId: rule.costCenterId,
        categoryId: rule.categoryId,
        minAmountCents: rule.minAmountCents,
        maxAmountCents: rule.maxAmountCents,
        requiresDualApproval: rule.requiresDualApproval,
        isActive: rule.isActive,
      })),
      dualApprovalThresholdCents: company.dualApprovalThresholdCents,
      at: data.at ?? new Date(),
    };

    return routing.route(input);
  }
}
