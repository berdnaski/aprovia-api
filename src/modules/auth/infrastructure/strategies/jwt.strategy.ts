import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { FindUserByIdUseCase } from 'src/modules/users/application/find-user-by-id.use-case';
import { AuthenticatedUser } from 'src/shared/domain/authenticated-user';
import { JwtPayload } from '../../application/services/jwt-token.service';
import { ACCESS_TOKEN_COOKIE } from '../interceptors/auth-cookies.interceptor';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>
          (request?.cookies as Record<string, string>)?.[ACCESS_TOKEN_COOKIE] ??
          null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.findUserByIdUseCase
      .execute(payload.sub)
      .catch(() => null);

    if (!user || user.disabledAt) {
      throw new UnauthorizedException('Sessão inválida.');
    }

    return {
      userId: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      isSuperAdmin: user.isSuperAdmin,
      companyId: payload.companyId,
      memberId: payload.memberId,
      role: payload.role,
    };
  }
}
