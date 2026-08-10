import { Injectable } from '@nestjs/common';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';

@Injectable()
export class DisableMemberUseCase {
  constructor(
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
  ) {}

  async execute(
    memberId: string,
    companyId: string,
    actorMemberId: string,
  ): Promise<void> {
    await this.findMemberByIdUseCase.execute(memberId, companyId);

    if (memberId === actorMemberId) {
      throw new ValidationError('Você não pode inativar o próprio acesso');
    }

    await this.companyMemberRepository.disable(memberId);
  }
}
