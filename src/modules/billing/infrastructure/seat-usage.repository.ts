import { Injectable } from '@nestjs/common';
import { InviteStatus } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { ISeatUsageRepository } from '../domain/seat-usage.repository.interface';

@Injectable()
export class SeatUsageRepository implements ISeatUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countOccupiedSeats(
    companyId: string,
    context?: TransactionContext,
  ): Promise<number> {
    const client = prismaClient(this.prisma, context);

    const [members, pendingInvites] = await Promise.all([
      client.companyMember.count({
        where: { company_id: companyId, disabled_at: null },
      }),
      client.invite.count({
        where: { company_id: companyId, status: InviteStatus.PENDING },
      }),
    ]);

    return members + pendingInvites;
  }
}
