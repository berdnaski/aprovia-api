import { Injectable, Logger } from '@nestjs/common';
import { TokenType } from 'generated/prisma/enums';
import { TOKEN_TTL } from '../../domain/token-expiration';
import { ITokensRepository } from '../../domain/tokens.repository.interface';
import { JwtTokenService } from './jwt-token.service';

interface IssueTokenOptions {
  userId: string;
  type: TokenType;
  referenceId?: string | null;
  replaceExisting?: boolean;
}

@Injectable()
export class IssueTokenService {
  private readonly logger = new Logger(IssueTokenService.name);

  constructor(
    private readonly tokensRepository: ITokensRepository,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async execute({
    userId,
    type,
    referenceId,
    replaceExisting,
  }: IssueTokenOptions): Promise<string> {
    if (replaceExisting) {
      await this.tokensRepository.deleteByUserAndType(userId, type);
    }

    const { value, hash } = this.jwtTokenService.generateOpaqueToken();

    await this.tokensRepository.create({
      userId,
      type,
      value: hash,
      referenceId,
      expiresAt: this.jwtTokenService.expiresAtFromNow(TOKEN_TTL[type]),
    });

    return value;
  }

  async deliver(
    recipient: string,
    send: () => Promise<void>,
  ): Promise<void> {
    try {
      await send();
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail para ${recipient}: ${String(error)}`,
      );
    }
  }
}
