import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { BudgetEntity } from '../domain/budget.entity';
import {
  CreateBudgetData,
  IBudgetRepository,
  UpdateBudgetAmountData,
} from '../domain/budgets.repository.interface';
import { BudgetMapper } from './mappers/budget.mapper';

@Injectable()
export class BudgetRepository implements IBudgetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateBudgetData,
    context?: TransactionContext,
  ): Promise<BudgetEntity> {
    const raw = await prismaClient(this.prisma, context).budget.create({
      data: {
        cost_center_id: data.costCenterId,
        period_start: data.periodStart,
        period_end: data.periodEnd,
        total_amount_cents: data.totalAmountCents,
      },
    });

    return BudgetMapper.toDomain(raw);
  }

  async findById(
    id: string,
    context?: TransactionContext,
  ): Promise<BudgetEntity | null> {
    const raw = await prismaClient(this.prisma, context).budget.findUnique({
      where: { id },
    });

    return raw ? BudgetMapper.toDomain(raw) : null;
  }

  async findByPeriod(
    costCenterId: string,
    periodStart: Date,
    context?: TransactionContext,
  ): Promise<BudgetEntity | null> {
    const raw = await prismaClient(this.prisma, context).budget.findUnique({
      where: {
        cost_center_id_period_start: {
          cost_center_id: costCenterId,
          period_start: periodStart,
        },
      },
    });

    return raw ? BudgetMapper.toDomain(raw) : null;
  }

  async findOverlapping(
    costCenterId: string,
    periodStart: Date,
    periodEnd: Date,
    context?: TransactionContext,
  ): Promise<BudgetEntity | null> {
    const raw = await prismaClient(this.prisma, context).budget.findFirst({
      where: {
        cost_center_id: costCenterId,
        period_start: { lte: periodEnd },
        period_end: { gte: periodStart },
      },
    });

    return raw ? BudgetMapper.toDomain(raw) : null;
  }

  async findCoveringDate(
    costCenterId: string,
    date: Date,
    context?: TransactionContext,
  ): Promise<BudgetEntity | null> {
    const raw = await prismaClient(this.prisma, context).budget.findFirst({
      where: {
        cost_center_id: costCenterId,
        period_start: { lte: date },
        period_end: { gte: date },
      },
    });

    return raw ? BudgetMapper.toDomain(raw) : null;
  }

  async listByCostCenter(costCenterId: string): Promise<BudgetEntity[]> {
    const records = await this.prisma.budget.findMany({
      where: { cost_center_id: costCenterId },
      orderBy: { period_start: 'desc' },
    });

    return records.map(BudgetMapper.toDomain);
  }

  async updateAmount(
    id: string,
    data: UpdateBudgetAmountData,
    context?: TransactionContext,
  ): Promise<BudgetEntity> {
    const raw = await prismaClient(this.prisma, context).budget.update({
      where: { id },
      data: {
        total_amount_cents: data.totalAmountCents,
        change_reason: data.changeReason,
        updated_by_id: data.updatedById,
      },
    });

    return BudgetMapper.toDomain(raw);
  }
}
