import { Injectable } from '@nestjs/common';
import { CostCenterMemberEntity } from '../domain/cost-center-member.entity';
import { ICostCenterMemberRepository } from '../domain/cost-center-members.repository.interface';
import { FindCostCenterByIdUseCase } from './find-cost-center-by-id.use-case';

@Injectable()
export class ListCostCenterMembersUseCase {
  constructor(
    private readonly costCenterMemberRepository: ICostCenterMemberRepository,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
  ) {}

  async execute(
    costCenterId: string,
    companyId: string,
  ): Promise<CostCenterMemberEntity[]> {
    await this.findCostCenterByIdUseCase.execute(costCenterId, companyId);

    return this.costCenterMemberRepository.listByCostCenter(costCenterId);
  }
}
