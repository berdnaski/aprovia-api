import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CompanyMemberRole } from 'generated/prisma/enums';
import { createHash, randomBytes } from 'node:crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  emailVerified: boolean;
  isSuperAdmin: boolean;
  companyId?: string;
  memberId?: string;
  role?: CompanyMemberRole;
}

export interface OpaqueToken {
  value: string;
  hash: string;
}

const OPAQUE_TOKEN_BYTES = 32;

@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  signAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.accessTokenTtl,
    });
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
  }

  generateOpaqueToken(): OpaqueToken {
    const value = randomBytes(OPAQUE_TOKEN_BYTES).toString('hex');
    return { value, hash: this.hashToken(value) };
  }

  hashToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  get accessTokenTtl(): number {
    return this.readSeconds('JWT_EXPIRES_IN', 900);
  }

  get refreshTokenTtl(): number {
    return this.readSeconds('REFRESH_TOKEN_EXPIRES_IN', 604800);
  }

  private readSeconds(key: string, fallback: number): number {
    const raw = this.configService.get<string | number>(key);
    const parsed = Number(raw);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  expiresAtFromNow(seconds: number): Date {
    return new Date(Date.now() + seconds * 1000);
  }
}
