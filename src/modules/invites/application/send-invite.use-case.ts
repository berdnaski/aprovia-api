import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenType } from 'generated/prisma/enums';
import { IssueTokenService } from 'src/modules/auth/application/services/issue-token.service';
import { ITokensRepository } from 'src/modules/auth/domain/tokens.repository.interface';
import { FindCompanyByIdUseCase } from 'src/modules/companies/application/find-company-by-id.use-case';
import { FindUserByIdUseCase } from 'src/modules/users/application/find-user-by-id.use-case';
import { IMailService } from 'src/shared/mail/application/mail.service';
import { InviteEntity } from '../domain/invite.entity';
import { renderInviteEmail } from '../infrastructure/invite-mail.template';

@Injectable()
export class SendInviteUseCase {
  private readonly logger = new Logger(SendInviteUseCase.name);

  constructor(
    private readonly issueTokenService: IssueTokenService,
    private readonly tokensRepository: ITokensRepository,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly mailService: IMailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(invite: InviteEntity): Promise<void> {
    await this.tokensRepository.consumeByReferences(
      [invite.id],
      TokenType.INVITE,
    );

    const token = await this.issueTokenService.execute({
      userId: null,
      type: TokenType.INVITE,
      referenceId: invite.id,
    });

    const [company, inviter] = await Promise.all([
      this.findCompanyByIdUseCase.execute(invite.companyId),
      this.findUserByIdUseCase.execute(invite.invitedById),
    ]);

    const template = renderInviteEmail({
      companyName: company.tradeName ?? company.legalName,
      inviterName: inviter.name,
      role: invite.role,
      token,
      frontendUrl: this.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:5173',
      ),
    });

    try {
      await this.mailService.send({ to: invite.email, ...template });
    } catch (error) {
      this.logger.error(
        `Convite ${invite.id} criado, mas o e-mail para ${invite.email} falhou: ${(error as Error).message}. Reenvie pelo painel`,
      );
    }
  }
}
