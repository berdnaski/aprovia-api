import { Injectable } from '@nestjs/common';
import { TokenType } from 'generated/prisma/enums';
import { FindUserByEmailUseCase } from 'src/modules/users/application/find-user-by-email.use-case';
import { AuthMailService } from 'src/shared/mail/application/auth-mail.service';
import { IssueTokenService } from './services/issue-token.service';

@Injectable()
export class ResendVerificationUseCase {
  constructor(
    private readonly findUserByEmailUseCase: FindUserByEmailUseCase,
    private readonly issueTokenService: IssueTokenService,
    private readonly authMailService: AuthMailService,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.findUserByEmailUseCase.execute(email);

    if (!user || user.emailVerified || user.disabledAt) {
      return;
    }

    const token = await this.issueTokenService.execute({
      userId: user.id,
      type: TokenType.EMAIL_VERIFICATION,
      replaceExisting: true,
    });

    await this.issueTokenService.deliver(user.email, () =>
      this.authMailService.sendEmailVerification(user.email, user.name, token),
    );
  }
}
