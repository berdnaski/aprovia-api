import { Injectable } from '@nestjs/common';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { CompanyMemberRole } from 'generated/prisma/enums';
import {
  LastAdminError,
  MemberAlreadyDisabledError,
  MemberHasResponsibilitiesError,
} from '../domain/companies.errors';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import { MemberAction } from '../domain/member-responsibility-guard';
import { MemberResponsibilityRegistry } from '../domain/services/member-responsibility.registry';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';

@Injectable()
export class DisableMemberUseCase {
  constructor(
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
    private readonly responsibilityRegistry: MemberResponsibilityRegistry,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    memberId: string,
    companyId: string,
    actorMemberId: string,
  ): Promise<void> {
    const member = await this.findMemberByIdUseCase.execute(
      memberId,
      companyId,
    );

    if (memberId === actorMemberId) {
      throw new ValidationError('Você não pode inativar o próprio acesso');
    }

    if (member.disabledAt) {
      throw new MemberAlreadyDisabledError();
    }

    await this.transactionManager.run(async (context) => {
      if (member.role === CompanyMemberRole.FINANCE_ADMIN) {
        await this.companyMemberRepository.lockActiveAdmins(companyId, context);

        const remaining = await this.companyMemberRepository.countActiveAdmins(
          companyId,
          { excludeMemberId: memberId },
          context,
        );

        if (remaining === 0) {
          throw new LastAdminError();
        }
      }

      const blockers = await this.responsibilityRegistry.collectBlockers(
        memberId,
        companyId,
        MemberAction.DEACTIVATE,
        context,
      );

      if (blockers.length > 0) {
        throw new MemberHasResponsibilitiesError(
          blockers,
          MemberAction.DEACTIVATE,
        );
      }

      await this.companyMemberRepository.reassignSubordinates(
        memberId,
        member.managerId,
        context,
      );

      await this.companyMemberRepository.clearSubstituteReferences(
        memberId,
        context,
      );

      await this.companyMemberRepository.updateSubstitute(
        memberId,
        { substituteId: null, absentFrom: null, absentUntil: null },
        context,
      );

      await this.companyMemberRepository.disable(memberId, context);
    });
  }
}
