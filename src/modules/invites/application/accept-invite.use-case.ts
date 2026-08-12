import { Injectable } from '@nestjs/common';
import {
  AuditEventType,
  InviteStatus,
  TokenType,
} from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { JwtTokenService } from 'src/modules/auth/application/services/jwt-token.service';
import { ITokensRepository } from 'src/modules/auth/domain/tokens.repository.interface';
import { EntitlementsService } from 'src/modules/billing/application/entitlements.service';
import { ICompanyMemberRepository } from 'src/modules/companies/domain/company-members.repository.interface';
import { FindUserByIdUseCase } from 'src/modules/users/application/find-user-by-id.use-case';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { InviteEntity } from '../domain/invite.entity';
import {
  AlreadyMemberError,
  InviteEmailMismatchError,
  InviteNotPendingError,
} from '../domain/invites.errors';
import { IInviteRepository } from '../domain/invites.repository.interface';
import { IMembershipReader } from '../domain/membership.reader';

export interface AcceptedInvite {
  invite: InviteEntity;
  memberId: string;
}

@Injectable()
export class AcceptInviteUseCase {
  constructor(
    private readonly inviteRepository: IInviteRepository,
    private readonly tokensRepository: ITokensRepository,
    private readonly jwtTokenService: JwtTokenService,
    private readonly companyMemberRepository: ICompanyMemberRepository,
    private readonly membershipReader: IMembershipReader,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly entitlementsService: EntitlementsService,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(token: string, userId: string): Promise<AcceptedInvite> {
    const record = await this.tokensRepository.findValidByValue(
      this.jwtTokenService.hashToken(token),
      TokenType.INVITE,
    );

    if (!record?.referenceId) {
      throw new NotFoundError('Convite');
    }

    const invite = await this.inviteRepository.findById(record.referenceId);

    if (!invite) {
      throw new NotFoundError('Convite', record.referenceId);
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new InviteNotPendingError(invite.status);
    }

    const user = await this.findUserByIdUseCase.execute(userId);

    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new InviteEmailMismatchError();
    }

    if (await this.membershipReader.isMember(invite.companyId, user.email)) {
      throw new AlreadyMemberError();
    }

    return this.transactionManager.run(async (context) => {
      const consumed = await this.tokensRepository.consume(record.id);

      if (!consumed) {
        throw new InviteNotPendingError(InviteStatus.ACCEPTED);
      }

      await this.entitlementsService.assertSeatAvailable(
        invite.companyId,
        context,
      );

      const member = await this.companyMemberRepository.create(
        {
          userId: user.id,
          companyId: invite.companyId,
          role: invite.role,
          defaultCostCenterId: invite.defaultCostCenterId,
          managerId: invite.managerId,
        },
        context,
      );

      const accepted = await this.inviteRepository.markAccepted(
        invite.id,
        context,
      );

      await this.auditLogRepository.record(
        {
          companyId: invite.companyId,
          actorId: user.id,
          eventType: AuditEventType.MEMBER_CHANGED,
          entityType: AuditEntity.COMPANY_MEMBER,
          entityId: member.id,
          newData: {
            email: invite.email,
            role: invite.role,
            inviteId: invite.id,
          },
        },
        context,
      );

      return { invite: accepted, memberId: member.id };
    });
  }
}
