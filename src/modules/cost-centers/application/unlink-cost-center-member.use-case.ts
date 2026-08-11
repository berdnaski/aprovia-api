import { Injectable } from '@nestjs/common';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { ICostCenterMemberRepository } from '../domain/cost-center-members.repository.interface';
import { MemberNotLinkedError } from '../domain/cost-centers.errors';
import { FindCostCenterByIdUseCase } from './find-cost-center-by-id.use-case';

@Injectable()
export class UnlinkCostCenterMemberUseCase {
  constructor(
    private readonly costCenterMemberRepository: ICostCenterMemberRepository,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
  ) {}

  async execute(
    costCenterId: string,
    companyId: string,
    memberId: string,
  ): Promise<void> {
    const costCenter = await this.findCostCenterByIdUseCase.execute(
      costCenterId,
      companyId,
    );

    if (costCenter.managerId === memberId) {
      throw new ValidationError(
        'O gestor não pode ser desvinculado do próprio Centro de Custo',
      );
    }

    const link = await this.costCenterMemberRepository.findLink(
      costCenterId,
      memberId,
    );

    if (!link) {
      throw new MemberNotLinkedError();
    }

    await this.costCenterMemberRepository.unlink(costCenterId, memberId);
  }
}
