import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { BudgetEntryEntity } from '../domain/budget-entry.entity';
import {
  CreateBudgetEntryData,
  IBudgetEntryRepository,
  ListBudgetEntriesFilter,
} from '../domain/budget-entries.repository.interface';
import { BudgetEntryMapper } from './mappers/budget-entry.mapper';

@Injectable()
export class BudgetEntryRepository implements IBudgetEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateBudgetEntryData,
    context?: TransactionContext,
  ): Promise<BudgetEntryEntity> {
    const raw = await prismaClient(this.prisma, context).budgetEntry.create({
      data: {
        budget_id: data.budgetId,
        purchase_request_id: data.purchaseRequestId,
        type: data.type,
        amount_cents: data.amountCents,
        description: data.description ?? null,
        recorded_by_id: data.recordedById ?? null,
      },
    });

    return BudgetEntryMapper.toDomain(raw);
  }

  async sumByBudget(
    budgetId: string,
    context?: TransactionContext,
  ): Promise<bigint> {
    const result = await prismaClient(
      this.prisma,
      context,
    ).budgetEntry.aggregate({
      where: { budget_id: budgetId },
      _sum: { amount_cents: true },
    });

    return result._sum.amount_cents ?? 0n;
  }

  async listByBudget(
    budgetId: string,
    filter?: ListBudgetEntriesFilter,
  ): Promise<BudgetEntryEntity[]> {
    const search = filter?.search?.trim();

    const records = await this.prisma.budgetEntry.findMany({
      where: {
        budget_id: budgetId,
        type: filter?.type,
        ...(search
          ? {
              description: {
                contains: search,
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      orderBy: { occurred_at: 'asc' },
    });

    return records.map(BudgetEntryMapper.toDomain);
  }

  async listByPurchaseRequest(
    purchaseRequestId: string,
    context?: TransactionContext,
  ): Promise<BudgetEntryEntity[]> {
    const records = await prismaClient(
      this.prisma,
      context,
    ).budgetEntry.findMany({
      where: { purchase_request_id: purchaseRequestId },
      orderBy: { occurred_at: 'asc' },
    });

    return records.map(BudgetEntryMapper.toDomain);
  }
}
