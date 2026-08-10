import { Injectable } from '@nestjs/common';
import { TokenType } from 'generated/prisma/enums';
import { ITokensRepository } from '../domain/tokens.repository.interface';
import { JwtTokenService } from './services/jwt-token.service';

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly tokensRepository: ITokensRepository,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async execute(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const hash = this.jwtTokenService.hashToken(refreshToken);

    const stored = await this.tokensRepository.findValidByValue(
      hash,
      TokenType.REFRESH_TOKEN,
    );

    if (stored) {
      await this.tokensRepository.consume(stored.id);
    }
  }
}
