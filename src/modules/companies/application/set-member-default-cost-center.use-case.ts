import { Injectable } from '@nestjs/common';
import { FindCostCenterByIdUseCase } from 'src/modules/cost-centers/application/find-cost-center-by-id.use-case';
import { CompanyMemberEntity } from '../domain/company-member.entity';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';

@Injectable()
export class SetMemberDefaultCostCenterUseCase {
  constructor(
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
    private readonly findCostCenterByIdUseCase: FindCostCenterByIdUseCase,
  ) {}

  async execute(
    memberId: string,
    companyId: string,
    costCenterId: string | null,
  ): Promise<CompanyMemberEntity> {
    await this.findMemberByIdUseCase.execute(memberId, companyId);

    if (costCenterId) {
      await this.findCostCenterByIdUseCase.execute(costCenterId, companyId);
    }

    return this.companyMemberRepository.updateDefaultCostCenter(
      memberId,
      costCenterId,
    );
  }
}
