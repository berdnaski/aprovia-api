import { Injectable, Logger } from '@nestjs/common';
import { ITokensRepository } from 'src/modules/auth/domain/tokens.repository.interface';

@Injectable()
export class PurgeExpiredTokensUseCase {
  private readonly logger = new Logger(PurgeExpiredTokensUseCase.name);

  constructor(private readonly tokensRepository: ITokensRepository) {}

  async execute(): Promise<number> {
    const removed = await this.tokensRepository.deleteExpired();

    if (removed > 0) {
      this.logger.log(`Tokens expirados removidos: ${removed}`);
    }

    return removed;
  }
}
