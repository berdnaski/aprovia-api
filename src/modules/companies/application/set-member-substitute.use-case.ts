import { Injectable } from '@nestjs/common';
import { CompanyMemberEntity } from '../domain/company-member.entity';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import {
  InvalidAbsencePeriodError,
  SelfSubstituteError,
  SubstituteDelegationError,
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

    if (data.absentUntil <= data.absentFrom) {
      throw new InvalidAbsencePeriodError();
    }

    const substitute = await this.findMemberByIdUseCase.execute(
      data.substituteId,
      companyId,
    );

    if (substitute.substituteId) {
      throw new SubstituteDelegationError();
    }

    return this.companyMemberRepository.updateSubstitute(memberId, {
      substituteId: data.substituteId,
      absentFrom: data.absentFrom,
      absentUntil: data.absentUntil,
    });
  }
}
