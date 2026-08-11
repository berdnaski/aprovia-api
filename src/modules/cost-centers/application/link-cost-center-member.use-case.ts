import { Injectable } from '@nestjs/common';
import { FindMemberByIdUseCase } from 'src/modules/companies/application/find-member-by-id.use-case';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { CostCenterMemberEntity } from '../domain/cost-center-member.entity';
import { ICostCenterMemberRepository } from '../domain/cost-center-members.repository.interface';
import { MemberAlreadyLinkedError } from '../domain/cost-centers.errors';
import { FindCostCenterByIdUseCase } from './find-cost-center-by-id.use-case';

@Injectable()
export class LinkCostCenterMemberUseCase {
  constructor(
    private readonly costCenterMemberRepository: ICostCenterMemberRepository,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
  ) {}

  async execute(
    costCenterId: string,
    companyId: string,
    memberId: string,
  ): Promise<CostCenterMemberEntity> {
    const costCenter = await this.findCostCenterByIdUseCase.execute(
      costCenterId,
      companyId,
    );

    if (costCenter.disabledAt) {
      throw new ValidationError(
        'Não é possível vincular membros a um Centro de Custo inativo',
      );
    }

    const member = await this.findMemberByIdUseCase.execute(
      memberId,
      companyId,
    );

    if (member.disabledAt) {
      throw new ValidationError('Não é possível vincular um membro inativo');
    }

    try {
      return await this.costCenterMemberRepository.link(costCenterId, memberId);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new MemberAlreadyLinkedError();
      }
      throw error;
    }
  }
}
