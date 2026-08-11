import { Injectable } from '@nestjs/common';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { CompanyMemberEntity } from '../domain/company-member.entity';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import {
  InactiveSubstituteError,
  InvalidAbsencePeriodError,
  SelfSubstituteError,
  SubstituteChainError,
  SubstituteDelegationError,
  SubstituteNotApproverError,
} from '../domain/companies.errors';
import { SetMemberSubstituteDto } from '../dto/set-member-substitute.dto';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';

@Injectable()
export class SetMemberSubstituteUseCase {
  constructor(
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
  ) {}

  async execute(
    memberId: string,
    companyId: string,
    data: SetMemberSubstituteDto,
  ): Promise<CompanyMemberEntity> {
    await this.findMemberByIdUseCase.execute(memberId, companyId);

    if (!data.substituteId) {
      return this.companyMemberRepository.updateSubstitute(memberId, {
        substituteId: null,
        absentFrom: null,
        absentUntil: null,
      });
    }

    if (data.substituteId === memberId) {
      throw new SelfSubstituteError();
    }

    if (!data.absentFrom || !data.absentUntil) {
      throw new InvalidAbsencePeriodError();
    }

    const absentFrom = this.toUtcDate(data.absentFrom);
    const absentUntil = this.toUtcDate(data.absentUntil);

    if (absentUntil <= absentFrom) {
      throw new InvalidAbsencePeriodError();
    }

    const delegatedToMember =
      await this.companyMemberRepository.listSubstitutedBy(memberId);

    if (delegatedToMember.length > 0) {
      throw new SubstituteChainError();
    }

    const substitute = await this.findMemberByIdUseCase.execute(
      data.substituteId,
      companyId,
    );

    if (substitute.disabledAt) {
      throw new InactiveSubstituteError();
    }

    if (substitute.role === CompanyMemberRole.REQUESTER) {
      throw new SubstituteNotApproverError();
    }

    if (substitute.substituteId) {
      throw new SubstituteDelegationError();
    }

    return this.companyMemberRepository.updateSubstitute(memberId, {
      substituteId: data.substituteId,
      absentFrom,
      absentUntil,
    });
  }

  private toUtcDate(value: Date): Date {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }
}
