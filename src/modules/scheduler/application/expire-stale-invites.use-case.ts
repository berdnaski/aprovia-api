import { Injectable, Logger } from '@nestjs/common';
import { IInviteRepository } from 'src/modules/invites/domain/invites.repository.interface';

const INVITE_TTL_HOURS = 72;

@Injectable()
export class ExpireStaleInvitesUseCase {
  private readonly logger = new Logger(ExpireStaleInvitesUseCase.name);

  constructor(private readonly inviteRepository: IInviteRepository) {}

  async execute(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - INVITE_TTL_HOURS * 3600 * 1000);
    const expired = await this.inviteRepository.expirePending(cutoff);

    if (expired.length > 0) {
      this.logger.log(`Convites expirados: ${expired.length}`);
    }

    return expired.length;
  }
}
