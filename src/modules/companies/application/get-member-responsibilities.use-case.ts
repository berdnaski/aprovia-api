import { Injectable } from '@nestjs/common';
import {
  MemberAction,
  ResponsibilityBlocker,
} from '../domain/member-responsibility-guard';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import { MemberResponsibilityRegistry } from '../domain/services/member-responsibility.registry';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';

export interface MemberResponsibilities {
  blockers: ResponsibilityBlocker[];
  subordinates: { id: string; userId: string }[];
  substituteFor: { id: string; userId: string }[];
  blocksDeactivation: boolean;
}

@Injectable()
export class GetMemberResponsibilitiesUseCase {
  constructor(
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
    private readonly responsibilityRegistry: MemberResponsibilityRegistry,
  ) {}

  async execute(
    memberId: string,
    companyId: string,
  ): Promise<MemberResponsibilities> {
    await this.findMemberByIdUseCase.execute(memberId, companyId);

    const blockers = await this.responsibilityRegistry.collectBlockers(
      memberId,
      companyId,
      MemberAction.DEACTIVATE,
    );

    const subordinates =
      await this.companyMemberRepository.listSubordinates(memberId);

    const substituteFor =
      await this.companyMemberRepository.listSubstitutedBy(memberId);

    return {
      blockers,
      subordinates: subordinates.map((member) => ({
        id: member.id,
        userId: member.userId,
      })),
      substituteFor: substituteFor.map((member) => ({
        id: member.id,
        userId: member.userId,
      })),
      blocksDeactivation: blockers.length > 0,
    };
  }
}
