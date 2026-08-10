import { Injectable } from '@nestjs/common';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { CompanyMemberEntity } from '../domain/company-member.entity';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';

@Injectable()
export class UpdateMemberLimitUseCase {
  constructor(
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
  ) {}

  async execute(
    memberId: string,
    companyId: string,
    limitCents: bigint,
  ): Promise<CompanyMemberEntity> {
    await this.findMemberByIdUseCase.execute(memberId, companyId);

    if (limitCents < 0n) {
      throw new ValidationError('A alçada não pode ser negativa');
    }

    return this.companyMemberRepository.updateApprovalLimit(
      memberId,
      limitCents,
    );
  }
}
