import { Injectable, Logger } from '@nestjs/common';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { formatCents } from 'src/shared/domain/money';
import { CompanyMemberEntity } from '../domain/company-member.entity';
import { ICompanyMemberRepository } from '../domain/company-members.repository.interface';
import {
  InactiveSubstituteError,
  InvalidAbsencePeriodError,
  SelfSubstituteError,
  SubstituteBelowLimitError,
  SubstituteChainError,
  SubstituteDelegationError,
  SubstituteNotApproverError,
} from '../domain/companies.errors';
import { AbsenceHandoverRegistry } from '../domain/services/absence-handover.registry';
import { SetMemberSubstituteDto } from '../dto/set-member-substitute.dto';
import { FindMemberByIdUseCase } from './find-member-by-id.use-case';

@Injectable()
export class SetMemberSubstituteUseCase {
  private readonly logger = new Logger(SetMemberSubstituteUseCase.name);

  constructor(
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
    private readonly absenceHandoverRegistry: AbsenceHandoverRegistry,
  ) {}

  async execute(
    memberId: string,
    companyId: string,
    data: SetMemberSubstituteDto,
  ): Promise<CompanyMemberEntity> {
    const member = await this.findMemberByIdUseCase.execute(
      memberId,
      companyId,
    );

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

    this.assertCoversLimit(member, substitute);

    const updated = await this.companyMemberRepository.updateSubstitute(
      memberId,
      { substituteId: data.substituteId, absentFrom, absentUntil },
    );

    if (this.isAbsentNow(absentFrom, absentUntil)) {
      await this.handOverWaitingSteps(companyId, memberId, data.substituteId);
    }

    return updated;
  }

  private assertCoversLimit(
    member: CompanyMemberEntity,
    substitute: CompanyMemberEntity,
  ): void {
    if (substitute.role === CompanyMemberRole.FINANCE_ADMIN) {
      return;
    }

    if (member.role === CompanyMemberRole.FINANCE_ADMIN) {
      throw new SubstituteBelowLimitError('sem teto');
    }

    if (substitute.approvalLimitCents < member.approvalLimitCents) {
      throw new SubstituteBelowLimitError(
        formatCents(member.approvalLimitCents),
      );
    }
  }

  private async handOverWaitingSteps(
    companyId: string,
    memberId: string,
    substituteId: string,
  ): Promise<void> {
    const moved = await this.absenceHandoverRegistry.handOverAll(
      companyId,
      memberId,
      substituteId,
    );

    if (moved > 0) {
      this.logger.log(
        `Ausência de ${memberId}: ${moved} ${moved === 1 ? 'pedido passou' : 'pedidos passaram'} para ${substituteId}.`,
      );
    }
  }

  private isAbsentNow(absentFrom: Date, absentUntil: Date): boolean {
    const today = this.toUtcDate(new Date());

    return today >= absentFrom && today <= absentUntil;
  }

  private toUtcDate(value: Date): Date {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }
}
