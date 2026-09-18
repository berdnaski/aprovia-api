import { Injectable } from '@nestjs/common';
import { RecurringOccurrenceStatus } from 'generated/prisma/enums';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { RecurringContractOccurrenceEntity } from '../domain/recurring-contract-occurrence.entity';
import {
  CreateOccurrenceData,
  IRecurringOccurrenceRepository,
  MatchOccurrenceData,
} from '../domain/recurring-occurrences.repository.interface';
import { RecurringOccurrenceMapper } from './mappers/recurring-occurrence.mapper';

@Injectable()
export class RecurringOccurrenceRepository implements IRecurringOccurrenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createIfAbsent(
    data: CreateOccurrenceData,
    context?: TransactionContext,
  ): Promise<{
    occurrence: RecurringContractOccurrenceEntity;
    created: boolean;
  }> {
    const client = prismaClient(this.prisma, context);

    try {
      const raw = await client.recurringContractOccurrence.create({
        data: {
          contract_id: data.contractId,
          period_start: data.periodStart,
          period_end: data.periodEnd,
          due_date: data.dueDate,
          expected_amount_cents: data.expectedAmountCents,
        },
      });

      return {
        occurrence: RecurringOccurrenceMapper.toDomain(raw),
        created: true,
      };
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }

      const existing = await client.recurringContractOccurrence.findUnique({
        where: {
          contract_id_period_start: {
            contract_id: data.contractId,
            period_start: data.periodStart,
          },
        },
      });

      return {
        occurrence: RecurringOccurrenceMapper.toDomain(existing!),
        created: false,
      };
    }
  }

  async findById(
    id: string,
    context?: TransactionContext,
  ): Promise<RecurringContractOccurrenceEntity | null> {
    const raw = await prismaClient(
      this.prisma,
      context,
    ).recurringContractOccurrence.findUnique({ where: { id } });

    return raw ? RecurringOccurrenceMapper.toDomain(raw) : null;
  }

  async listByContract(
    contractId: string,
  ): Promise<RecurringContractOccurrenceEntity[]> {
    const records = await this.prisma.recurringContractOccurrence.findMany({
      where: { contract_id: contractId },
      orderBy: { period_start: 'desc' },
    });

    return records.map(RecurringOccurrenceMapper.toDomain);
  }

  async findOldestPending(
    contractId: string,
    context?: TransactionContext,
  ): Promise<RecurringContractOccurrenceEntity | null> {
    const raw = await prismaClient(
      this.prisma,
      context,
    ).recurringContractOccurrence.findFirst({
      where: {
        contract_id: contractId,
        status: RecurringOccurrenceStatus.PENDING,
      },
      orderBy: { period_start: 'asc' },
    });

    return raw ? RecurringOccurrenceMapper.toDomain(raw) : null;
  }

  async setBudgetEntry(
    id: string,
    budgetEntryId: string,
    context?: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).recurringContractOccurrence.update(
      {
        where: { id },
        data: { budget_entry_id: budgetEntryId },
      },
    );
  }

  async markMatched(
    id: string,
    data: MatchOccurrenceData,
    context?: TransactionContext,
  ): Promise<RecurringContractOccurrenceEntity> {
    const raw = await prismaClient(
      this.prisma,
      context,
    ).recurringContractOccurrence.update({
      where: { id },
      data: {
        status: RecurringOccurrenceStatus.MATCHED,
        invoice_id: data.invoiceId,
        payable_id: data.payableId,
        override_note: data.overrideNote,
        matched_at: new Date(),
      },
    });

    return RecurringOccurrenceMapper.toDomain(raw);
  }

  async setStatus(
    id: string,
    status: RecurringOccurrenceStatus,
    context?: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).recurringContractOccurrence.update(
      {
        where: { id },
        data: { status },
      },
    );
  }
}
