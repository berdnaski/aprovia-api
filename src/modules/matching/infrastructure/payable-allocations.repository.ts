import { Injectable } from '@nestjs/common';
import { PayableStatus } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { PayableAllocationEntity } from '../domain/payable-allocation.entity';
import {
  CreatePayableAllocationData,
  IPayableAllocationRepository,
} from '../domain/payable-allocations.repository.interface';
import { PayableAllocationMapper } from './mappers/payable-allocation.mapper';

@Injectable()
export class PayableAllocationRepository implements IPayableAllocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByPayable(
    payableId: string,
    context?: TransactionContext,
  ): Promise<PayableAllocationEntity[]> {
    const records = await prismaClient(
      this.prisma,
      context,
    ).payableAllocation.findMany({
      where: { payable_id: payableId },
      orderBy: { amount_cents: 'desc' },
    });

    return records.map(PayableAllocationMapper.toDomain);
  }

  async replace(
    payableId: string,
    lines: CreatePayableAllocationData[],
    context?: TransactionContext,
  ): Promise<PayableAllocationEntity[]> {
    const client = prismaClient(this.prisma, context);

    await client.payableAllocation.deleteMany({
      where: { payable_id: payableId },
    });

    if (lines.length > 0) {
      await client.payableAllocation.createMany({
        data: lines.map((line) => ({
          payable_id: payableId,
          cost_center_id: line.costCenterId,
          chart_account_id: line.chartAccountId,
          amount_cents: line.amountCents,
        })),
      });
    }

    return this.listByPayable(payableId, context);
  }

  async sumPaidByCostCenterAndPeriod(
    costCenterId: string,
    periodStart: Date,
    periodEnd: Date,
    context?: TransactionContext,
  ): Promise<bigint> {
    const result = await prismaClient(
      this.prisma,
      context,
    ).payableAllocation.aggregate({
      where: {
        cost_center_id: costCenterId,
        payable: {
          status: PayableStatus.PAID,
          paid_at: { gte: periodStart, lte: periodEnd },
        },
      },
      _sum: { amount_cents: true },
    });

    return result._sum.amount_cents ?? 0n;
  }
}
