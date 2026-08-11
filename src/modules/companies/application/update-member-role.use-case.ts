import { Injectable } from '@nestjs/common';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import {
  LastAdminError,
  MemberHasResponsibilitiesError,
} from '../domain/companies.errors';
import { CompanyMemberEntity } from '../domain/company-member.entity';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import { MemberAction } from '../domain/member-responsibility-guard';
import { MemberResponsibilityRegistry } from '../domain/services/member-responsibility.registry';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';

@Injectable()
export class UpdateMemberRoleUseCase {
  constructor(
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
    private readonly responsibilityRegistry: MemberResponsibilityRegistry,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    memberId: string,
    companyId: string,
    role: CompanyMemberRole,
  ): Promise<CompanyMemberEntity> {
    const member = await this.findMemberByIdUseCase.execute(
      memberId,
      companyId,
    );

    if (member.role === role) {
      return member;
    }

    const losesAdmin =
      member.role === CompanyMemberRole.FINANCE_ADMIN &&
      role !== CompanyMemberRole.FINANCE_ADMIN;

    const losesApprovalPower =
      member.role !== CompanyMemberRole.REQUESTER &&
      role === CompanyMemberRole.REQUESTER;

    if (!losesAdmin && !losesApprovalPower) {
      return this.companyMemberRepository.updateRole(memberId, role);
    }

    return this.transactionManager.run(async (context) => {
      if (losesAdmin) {
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

      if (losesApprovalPower) {
        const blockers = await this.responsibilityRegistry.collectBlockers(
          memberId,
          companyId,
          MemberAction.DEMOTE,
          context,
        );

        if (blockers.length > 0) {
          throw new MemberHasResponsibilitiesError(
            blockers,
            MemberAction.DEMOTE,
          );
        }
      }

      return this.companyMemberRepository.updateRole(memberId, role, context);
    });
  }
}
