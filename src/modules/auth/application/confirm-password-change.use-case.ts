import { Injectable } from '@nestjs/common';
import { TokenType } from 'generated/prisma/enums';
import { ChangeUserPasswordUseCase } from 'src/modules/users/application/change-user-password.use-case';
import { FindUserByIdUseCase } from 'src/modules/users/application/find-user-by-id.use-case';
import { AuthMailService } from 'src/shared/mail/application/auth-mail.service';
import { InvalidTokenError } from '../domain/auth.errors';
import { ITokensRepository } from '../domain/tokens.repository.interface';
import { IssueTokenService } from './services/issue-token.service';
import { JwtTokenService } from './services/jwt-token.service';

@Injectable()
export class ConfirmPasswordChangeUseCase {
  constructor(
    private readonly tokensRepository: ITokensRepository,
    private readonly changeUserPasswordUseCase: ChangeUserPasswordUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly jwtTokenService: JwtTokenService,
    private readonly issueTokenService: IssueTokenService,
    private readonly authMailService: AuthMailService,
  ) {}

  async execute(token: string): Promise<void> {
    const hash = this.jwtTokenService.hashToken(token);

    const stored = await this.tokensRepository.findValidByValue(
      hash,
      TokenType.PASSWORD_CHANGE,
    );

    if (!stored?.userId || !stored.referenceId) {
      throw new InvalidTokenError();
    }

    await this.changeUserPasswordUseCase.execute(
      stored.userId,
      stored.referenceId,
    );
    await this.tokensRepository.consume(stored.id);
    await this.tokensRepository.deleteByUserAndType(
      stored.userId,
      TokenType.REFRESH_TOKEN,
    );

    const user = await this.findUserByIdUseCase
      .execute(stored.userId)
      .catch(() => null);

    if (user) {
      await this.issueTokenService.deliver(user.email, () =>
        this.authMailService.sendPasswordChanged(user.email, user.name),
      );
    }
  }
}
