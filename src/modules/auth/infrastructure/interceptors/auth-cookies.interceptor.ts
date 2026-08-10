import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { CookieOptions, Response } from 'express';
import { Observable, map } from 'rxjs';
import { AuthTokenEntity } from '../../domain/auth-token.entity';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export interface WithTokens {
  tokens: AuthTokenEntity;
}

export function buildCookieOptions(maxAgeSeconds: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds * 1000,
  };
}

@Injectable()
export class AuthCookiesInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((payload: WithTokens & Record<string, unknown>) => {
        if (!payload?.tokens) {
          return payload;
        }

        const { tokens, ...body } = payload;

        response.cookie(
          ACCESS_TOKEN_COOKIE,
          tokens.accessToken,
          buildCookieOptions(tokens.expiresIn),
        );

        response.cookie(
          REFRESH_TOKEN_COOKIE,
          tokens.refreshToken,
          buildCookieOptions(
            Number(process.env.REFRESH_TOKEN_EXPIRES_IN ?? 604800),
          ),
        );

        return Object.keys(body).length > 0 ? body : { success: true };
      }),
    );
  }
}
