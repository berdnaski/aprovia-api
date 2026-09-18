import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { RequestAllocationEntity } from '../domain/request-allocation.entity';
import { IRequestAllocationRepository } from '../domain/request-allocations.repository.interface';
import { AllocationShare } from '../domain/services/allocation-split';
import { RequestAllocationMapper } from './mappers/request-allocation.mapper';

@Injectable()
export class RequestAllocationRepository implements IRequestAllocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByRequest(
    purchaseRequestId: string,
    context?: TransactionContext,
  ): Promise<RequestAllocationEntity[]> {
    const records = await prismaClient(
      this.prisma,
      context,
    ).requestAllocation.findMany({
      where: { purchase_request_id: purchaseRequestId },
      orderBy: [
        { share_bps: 'desc' },
        { cost_center_id: 'asc' },
        { chart_account_id: 'asc' },
      ],
    });

    return records.map(RequestAllocationMapper.toDomain);
  }

  async replace(
    purchaseRequestId: string,
    lines: AllocationShare[],
    context?: TransactionContext,
  ): Promise<RequestAllocationEntity[]> {
    const client = prismaClient(this.prisma, context);

    await client.requestAllocation.deleteMany({
      where: { purchase_request_id: purchaseRequestId },
    });

    await client.requestAllocation.createMany({
      data: lines.map((line) => ({
        purchase_request_id: purchaseRequestId,
        cost_center_id: line.costCenterId,
        chart_account_id: line.chartAccountId,
        share_bps: line.shareBps,
      })),
    });

    return this.listByRequest(purchaseRequestId, context);
  }

  async deleteByRequest(
    purchaseRequestId: string,
    context?: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).requestAllocation.deleteMany({
      where: { purchase_request_id: purchaseRequestId },
    });
  }
}
