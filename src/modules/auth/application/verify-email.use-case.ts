import { Injectable } from '@nestjs/common';
import { TokenType } from 'generated/prisma/enums';
import { MarkEmailAsVerifiedUseCase } from 'src/modules/users/application/mark-email-as-verified.use-case';
import { InvalidTokenError } from '../domain/auth.errors';
import { ITokensRepository } from '../domain/tokens.repository.interface';
import { JwtTokenService } from './services/jwt-token.service';

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    private readonly tokensRepository: ITokensRepository,
    private readonly markEmailAsVerifiedUseCase: MarkEmailAsVerifiedUseCase,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async execute(token: string): Promise<void> {
    const hash = this.jwtTokenService.hashToken(token);

    const stored = await this.tokensRepository.findValidByValue(
      hash,
      TokenType.EMAIL_VERIFICATION,
    );

    if (!stored?.userId) {
      throw new InvalidTokenError();
    }

    await this.markEmailAsVerifiedUseCase.execute(stored.userId);
    await this.tokensRepository.consume(stored.id);
  }
}
