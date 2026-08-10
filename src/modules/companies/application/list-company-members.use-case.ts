import { Injectable } from '@nestjs/common';
import { CompanyMemberEntity } from '../domain/company-member.entity';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';

@Injectable()
export class ListCompanyMembersUseCase {
  constructor(
    private readonly companyMemberRepository: ICompanyMemberRepository,
  ) {}

  execute(companyId: string): Promise<CompanyMemberEntity[]> {
    return this.companyMemberRepository.list(companyId);
  }
}
