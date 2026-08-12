import { Injectable } from '@nestjs/common';
import { InviteStatus, TokenType } from 'generated/prisma/enums';
import { JwtTokenService } from 'src/modules/auth/application/services/jwt-token.service';
import { ITokensRepository } from 'src/modules/auth/domain/tokens.repository.interface';
import { FindCompanyByIdUseCase } from 'src/modules/companies/application/find-company-by-id.use-case';
import { FindUserByIdUseCase } from 'src/modules/users/application/find-user-by-id.use-case';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { InviteEntity, InvitePreview } from '../domain/invite.entity';
import { InviteNotPendingError } from '../domain/invites.errors';
import { IInviteRepository } from '../domain/invites.repository.interface';
import { SendInviteUseCase } from './send-invite.use-case';

const STATUS_REASON: Record<InviteStatus, string | null> = {
  PENDING: null,
  ACCEPTED: 'Este convite já foi aceito.',
  EXPIRED: 'Este convite expirou. Peça ao Admin Financeiro para reenviá-lo.',
  REVOKED: 'Este convite foi revogado pelo Admin Financeiro.',
};

@Injectable()
export class ManageInvitesUseCase {
  constructor(
    private readonly inviteRepository: IInviteRepository,
    private readonly tokensRepository: ITokensRepository,
    private readonly jwtTokenService: JwtTokenService,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly sendInviteUseCase: SendInviteUseCase,
  ) {}

  list(companyId: string, status?: InviteStatus): Promise<InviteEntity[]> {
    return this.inviteRepository.listByCompany(companyId, status);
  }

  async resend(id: string, companyId: string): Promise<InviteEntity> {
    const invite = await this.load(id, companyId);

    if (invite.status !== InviteStatus.PENDING) {
      throw new InviteNotPendingError(invite.status);
    }

    await this.sendInviteUseCase.execute(invite);

    return invite;
  }

  async revoke(id: string, companyId: string): Promise<InviteEntity> {
    const invite = await this.load(id, companyId);

    if (invite.status !== InviteStatus.PENDING) {
      throw new InviteNotPendingError(invite.status);
    }

    await this.tokensRepository.consumeByReferences(
      [invite.id],
      TokenType.INVITE,
    );

    return this.inviteRepository.markRevoked(invite.id);
  }

  async preview(token: string): Promise<InvitePreview> {
    const record = await this.tokensRepository.findByValue(
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

    const [company, inviter] = await Promise.all([
      this.findCompanyByIdUseCase.execute(invite.companyId),
      this.findUserByIdUseCase.execute(invite.invitedById),
    ]);

    const expired =
      record.consumedAt !== null || record.expiresAt <= new Date();

    const reason =
      STATUS_REASON[invite.status] ??
      (expired
        ? 'Este link expirou. Peça ao Admin Financeiro para reenviá-lo.'
        : null);

    return {
      companyName: company.tradeName ?? company.legalName,
      email: invite.email,
      role: invite.role,
      invitedByName: inviter.name,
      actionable: reason === null,
      reason,
    };
  }

  private async load(id: string, companyId: string): Promise<InviteEntity> {
    const invite = await this.inviteRepository.findById(id);

    if (!invite || invite.companyId !== companyId) {
      throw new NotFoundError('Convite', id);
    }

    return invite;
  }
}
