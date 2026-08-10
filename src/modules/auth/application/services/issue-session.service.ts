import { Injectable } from '@nestjs/common';
import { TokenType } from 'generated/prisma/enums';
import { UserEntity } from 'src/modules/users/domain/user.entity';
import { AuthTokenEntity } from '../../domain/auth-token.entity';
import { MembershipEntity } from '../../domain/membership.entity';
import { TOKEN_TTL } from '../../domain/token-expiration';
import { ITokensRepository } from '../../domain/tokens.repository.interface';
import { JwtTokenService } from './jwt-token.service';

@Injectable()
export class IssueSessionService {
  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly tokensRepository: ITokensRepository,
  ) {}

  async execute(
    user: UserEntity,
    membership?: MembershipEntity,
  ): Promise<AuthTokenEntity> {
    const accessToken = this.jwtTokenService.signAccessToken({
      sub: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      isSuperAdmin: user.isSuperAdmin,
      companyId: membership?.companyId,
      memberId: membership?.memberId,
      role: membership?.role,
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
