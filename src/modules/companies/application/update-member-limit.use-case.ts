import { Injectable } from '@nestjs/common';
import { CompanyMemberRole } from 'generated/prisma/enums';
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
    const member = await this.findMemberByIdUseCase.execute(
      memberId,
      companyId,
    );

    if (limitCents < 0n) {
      throw new ValidationError('A alçada não pode ser negativa');
    }

    if (member.role !== CompanyMemberRole.APPROVER) {
      throw new ValidationError(
        'Só quem tem perfil de Aprovador tem alçada. Mude o perfil da pessoa antes de definir um valor.',
      );
    }

    return this.companyMemberRepository.updateApprovalLimit(
      memberId,
      limitCents,
    );
  }
}
