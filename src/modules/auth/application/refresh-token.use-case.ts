import { Injectable } from '@nestjs/common';
import { TokenType } from 'generated/prisma/enums';
import { FindUserByIdUseCase } from 'src/modules/users/application/find-user-by-id.use-case';
import { AuthTokenEntity } from '../domain/auth-token.entity';
import {
  AccountDisabledError,
  InvalidTokenError,
} from '../domain/auth.errors';
import { IMembershipsRepository } from '../domain/memberships.repository.interface';
import { ITokensRepository } from '../domain/tokens.repository.interface';
import { IssueSessionService } from './services/issue-session.service';
import { JwtTokenService } from './services/jwt-token.service';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly tokensRepository: ITokensRepository,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly membershipsRepository: IMembershipsRepository,
    private readonly issueSessionService: IssueSessionService,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async execute(refreshToken: string): Promise<AuthTokenEntity> {
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

    const membership = await this.membershipsRepository.findActiveByUser(
      user.id,
    );

    return this.issueSessionService.execute(user, membership ?? undefined);
  }
}
