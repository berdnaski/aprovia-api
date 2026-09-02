import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { IRequestUsageRepository } from '../domain/seat-usage.repository.interface';

@Injectable()
export class RequestUsageRepository implements IRequestUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countSubmittedThisMonth(
    companyId: string,
    reference: Date,
    context?: TransactionContext,
  ): Promise<number> {
    const start = new Date(
      Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1),
    );
    const next = new Date(
      Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1),
    );

    return prismaClient(this.prisma, context).purchaseRequest.count({
      where: {
        company_id: companyId,
        submitted_at: { gte: start, lt: next },
      },
    });
  }
}
