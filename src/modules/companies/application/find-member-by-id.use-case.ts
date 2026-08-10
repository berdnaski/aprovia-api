import { Injectable } from '@nestjs/common';
import {
  ForbiddenError,
  NotFoundError,
} from 'src/shared/domain/errors/domain.error';
import { CompanyMemberEntity } from '../domain/company-member.entity';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';

@Injectable()
export class FindMemberByIdUseCase {
  constructor(
    private readonly companyMemberRepository: ICompanyMemberRepository,
  ) {}

  async execute(id: string, companyId: string): Promise<CompanyMemberEntity> {
    const member = await this.companyMemberRepository.findById(id);

    if (!member) {
      throw new NotFoundError('Membro', id);
    }

    if (member.companyId !== companyId) {
      throw new ForbiddenError('Este membro pertence a outra empresa');
    }

    return member;
  }
}
