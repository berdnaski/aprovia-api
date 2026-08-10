import { Injectable } from '@nestjs/common';
import { CompanyMemberEntity } from '../domain/company-member.entity';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import { SelfManagerError } from '../domain/companies.errors';
import { HierarchyService } from '../domain/services/hierarchy.service';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';

@Injectable()
export class SetMemberManagerUseCase {
  constructor(
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
    private readonly hierarchyService: HierarchyService,
  ) {}

  async execute(
    memberId: string,
    companyId: string,
    managerId: string | null,
  ): Promise<CompanyMemberEntity> {
    await this.findMemberByIdUseCase.execute(memberId, companyId);

    if (managerId) {
      if (managerId === memberId) {
        throw new SelfManagerError();
      }

      await this.findMemberByIdUseCase.execute(managerId, companyId);
      await this.hierarchyService.assertNoCycle(memberId, managerId);
    }

    return this.companyMemberRepository.updateManager(memberId, managerId);
  }
}
