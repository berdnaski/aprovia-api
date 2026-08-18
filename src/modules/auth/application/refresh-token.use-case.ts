import { Injectable } from '@nestjs/common';
import { TokenType } from 'generated/prisma/enums';
import { FindActiveMembershipUseCase } from 'src/modules/companies/application/find-active-membership.use-case';
import { FindUserByIdUseCase } from 'src/modules/users/application/find-user-by-id.use-case';
import { AuthTokenEntity } from '../domain/auth-token.entity';
import { AccountDisabledError, InvalidTokenError } from '../domain/auth.errors';
import { ITokensRepository } from '../domain/tokens.repository.interface';
import { IssueSessionService } from './services/issue-session.service';
import { JwtTokenService } from './services/jwt-token.service';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly tokensRepository: ITokensRepository,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly findActiveMembershipUseCase: FindActiveMembershipUseCase,
    private readonly issueSessionService: IssueSessionService,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async execute(refreshToken?: string): Promise<AuthTokenEntity> {
    if (!refreshToken) {
      throw new InvalidTokenError();
    }

    const hash = this.jwtTokenService.hashToken(refreshToken);

    const stored = await this.tokensRepository.findValidByValue(
      hash,
      TokenType.REFRESH_TOKEN,
    );

    if (!stored?.userId) {
      throw new InvalidTokenError();
    }

    await this.tokensRepository.consume(stored.id);

    const user = await this.findUserByIdUseCase.execute(stored.userId);

    if (user.disabledAt) {
      throw new AccountDisabledError();
    }

    const membership = await this.findActiveMembershipUseCase.execute(user.id);

    return this.issueSessionService.execute(user, membership ?? undefined);
  }
}
