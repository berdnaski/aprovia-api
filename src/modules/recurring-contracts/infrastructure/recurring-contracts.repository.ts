import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { RecurringContractEntity } from '../domain/recurring-contract.entity';
import {
  CancelRecurringContractData,
  CreateRecurringContractData,
  IRecurringContractRepository,
  ListRecurringContractsFilter,
} from '../domain/recurring-contracts.repository.interface';
import { RecurringContractMapper } from './mappers/recurring-contract.mapper';

@Injectable()
export class RecurringContractRepository implements IRecurringContractRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateRecurringContractData,
    context?: TransactionContext,
  ): Promise<RecurringContractEntity> {
    const raw = await prismaClient(
      this.prisma,
      context,
    ).recurringContract.create({
      data: {
        company_id: data.companyId,
        source_request_id: data.sourceRequestId,
        supplier_id: data.supplierId,
        cost_center_id: data.costCenterId,
        category_id: data.categoryId,
        chart_account_id: data.chartAccountId,
        title: data.title,
        amount_cents: data.amountCents,
        frequency: data.frequency,
        start_date: data.startDate,
        next_occurrence_date: data.nextOccurrenceDate,
        created_by_id: data.createdById,
      },
    });

    return RecurringContractMapper.toDomain(raw);
  }

  async findById(
    id: string,
    context?: TransactionContext,
  ): Promise<RecurringContractEntity | null> {
    const raw = await prismaClient(
      this.prisma,
      context,
    ).recurringContract.findUnique({ where: { id } });

    return raw ? RecurringContractMapper.toDomain(raw) : null;
  }

  async findBySourceRequestId(
    sourceRequestId: string,
  ): Promise<RecurringContractEntity | null> {
    const raw = await this.prisma.recurringContract.findUnique({
      where: { source_request_id: sourceRequestId },
    });

    return raw ? RecurringContractMapper.toDomain(raw) : null;
  }

  async list(
    companyId: string,
    filter?: ListRecurringContractsFilter,
  ): Promise<RecurringContractEntity[]> {
    const records = await this.prisma.recurringContract.findMany({
      where: {
        company_id: companyId,
        active: filter?.active,
        source_request_id: filter?.sourceRequestId,
      },
      orderBy: { created_at: 'desc' },
    });

    return records.map(RecurringContractMapper.toDomain);
  }

  async listDueForGeneration(now: Date): Promise<RecurringContractEntity[]> {
    const records = await this.prisma.recurringContract.findMany({
      where: { active: true, next_occurrence_date: { lte: now } },
    });

    return records.map(RecurringContractMapper.toDomain);
  }

  async cancel(
    id: string,
    data: CancelRecurringContractData,
    context?: TransactionContext,
  ): Promise<RecurringContractEntity> {
    const raw = await prismaClient(
      this.prisma,
      context,
    ).recurringContract.update({
      where: { id },
      data: {
        active: false,
        canceled_at: data.canceledAt,
        cancel_reason: data.cancelReason,
      },
    });

    return RecurringContractMapper.toDomain(raw);
  }

  async advanceNextOccurrence(
    id: string,
    nextOccurrenceDate: Date,
    context?: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).recurringContract.update({
      where: { id },
      data: { next_occurrence_date: nextOccurrenceDate },
    });
  }
}
