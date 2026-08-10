import { Injectable } from '@nestjs/common';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { CompanyMemberEntity } from '../domain/company-member.entity';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';

@Injectable()
export class UpdateMemberRoleUseCase {
  constructor(
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
  ) {}

  async execute(
    memberId: string,
    companyId: string,
    role: CompanyMemberRole,
  ): Promise<CompanyMemberEntity> {
    await this.findMemberByIdUseCase.execute(memberId, companyId);

    return this.companyMemberRepository.updateRole(memberId, role);
  }
}
