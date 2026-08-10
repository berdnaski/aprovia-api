import { Injectable } from '@nestjs/common';
import { CompanyMemberRole, TokenType } from 'generated/prisma/enums';
import { UserEntity } from 'src/modules/users/domain/user.entity';
import { AuthTokenEntity } from '../../domain/auth-token.entity';
import { TOKEN_TTL } from '../../domain/token-expiration';
import { ITokensRepository } from '../../domain/tokens.repository.interface';
import { JwtTokenService } from './jwt-token.service';

export interface SessionContext {
  companyId: string;
  memberId: string;
  role: CompanyMemberRole;
}

@Injectable()
export class IssueSessionService {
  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly tokensRepository: ITokensRepository,
  ) {}

  async execute(
    user: UserEntity,
    context?: SessionContext,
  ): Promise<AuthTokenEntity> {
    const accessToken = this.jwtTokenService.signAccessToken({
      sub: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      isSuperAdmin: user.isSuperAdmin,
      companyId: context?.companyId,
      memberId: context?.memberId,
      role: context?.role,
    });

    const { value, hash } = this.jwtTokenService.generateOpaqueToken();

    await this.tokensRepository.create({
      userId: user.id,
      type: TokenType.REFRESH_TOKEN,
      value: hash,
      expiresAt: this.jwtTokenService.expiresAtFromNow(TOKEN_TTL.REFRESH_TOKEN),
    });

    const tokens = new AuthTokenEntity();
    tokens.accessToken = accessToken;
    tokens.refreshToken = value;
    tokens.expiresIn = this.jwtTokenService.accessTokenTtl;

    return tokens;
  }
}
