import { Injectable, Logger } from '@nestjs/common';
import { AuditEventType, BudgetEntryType } from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { IBudgetEntryRepository } from 'src/modules/budgets/domain/budget-entries.repository.interface';
import { IBudgetRepository } from 'src/modules/budgets/domain/budgets.repository.interface';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { RecurringContractEntity } from '../domain/recurring-contract.entity';
import {
  cycleFor,
  nextCycleStart,
  periodLabel,
} from '../domain/services/recurring-schedule.service';
import { IRecurringContractRepository } from '../domain/recurring-contracts.repository.interface';
import { IRecurringOccurrenceRepository } from '../domain/recurring-occurrences.repository.interface';

const MAX_CYCLES_PER_RUN = 24;

@Injectable()
export class GenerateRecurringOccurrencesUseCase {
  private readonly logger = new Logger(
    GenerateRecurringOccurrencesUseCase.name,
  );

  constructor(
    private readonly recurringContractRepository: IRecurringContractRepository,
    private readonly recurringOccurrenceRepository: IRecurringOccurrenceRepository,
    private readonly budgetRepository: IBudgetRepository,
    private readonly budgetEntryRepository: IBudgetEntryRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(now: Date = new Date()): Promise<number> {
    const due =
      await this.recurringContractRepository.listDueForGeneration(now);
    let generated = 0;

    for (const contract of due) {
      generated += await this.processContract(contract, now);
    }

    return generated;
  }

  private async processContract(
    contract: RecurringContractEntity,
    now: Date,
  ): Promise<number> {
    let cursor = contract.nextOccurrenceDate;
    let generated = 0;

    for (let cycle = 0; cycle < MAX_CYCLES_PER_RUN && cursor <= now; cycle++) {
      const { periodStart, periodEnd, dueDate } = cycleFor(
        contract.frequency,
        cursor,
      );
      const advanceTo = nextCycleStart(contract.frequency, cursor);

      await this.transactionManager.run(async (context) => {
        const { occurrence, created } =
          await this.recurringOccurrenceRepository.createIfAbsent(
            {
              contractId: contract.id,
              periodStart,
              periodEnd,
              dueDate,
              expectedAmountCents: contract.amountCents,
            },
            context,
          );

        if (created) {
          const budget = await this.budgetRepository.findCoveringDate(
            contract.costCenterId,
            dueDate,
            context,
          );

          if (budget) {
            const existingEntries =
              await this.budgetEntryRepository.listByPurchaseRequest(
                contract.sourceRequestId,
                context,
              );
            const alreadyConsumed = existingEntries.some(
              (existing) =>
                existing.budgetId === budget.id &&
                existing.type === BudgetEntryType.CONSUMPTION,
            );

            if (alreadyConsumed) {
              this.logger.log(
                `Assinatura ${contract.title}: ${periodLabel(periodStart)} já foi consumida pela aprovação original do pedido, sem novo lançamento.`,
              );
            } else {
              const entry = await this.budgetEntryRepository.create(
                {
                  budgetId: budget.id,
                  purchaseRequestId: contract.sourceRequestId,
                  type: BudgetEntryType.CONSUMPTION,
                  amountCents: contract.amountCents,
                  description: `Assinatura recorrente: ${contract.title} (${periodLabel(periodStart)})`,
                },
                context,
              );

              await this.recurringOccurrenceRepository.setBudgetEntry(
                occurrence.id,
                entry.id,
                context,
              );
            }
          } else {
            this.logger.warn(
              `Assinatura ${contract.title}: sem orçamento cadastrado para ${periodLabel(periodStart)} no centro de custo ${contract.costCenterId}.`,
            );
          }

          await this.auditLogRepository.record(
            {
              companyId: contract.companyId,
              actorId: null,
              eventType: AuditEventType.RECURRING_OCCURRENCE_GENERATED,
              entityType: AuditEntity.RECURRING_CONTRACT,
              entityId: contract.id,
              newData: {
                occurrenceId: occurrence.id,
                period: periodLabel(periodStart),
                amountCents: contract.amountCents.toString(),
              },
            },
            context,
          );
        }

        await this.recurringContractRepository.advanceNextOccurrence(
          contract.id,
          advanceTo,
          context,
        );
      });

      generated += 1;
      cursor = advanceTo;
    }

    return generated;
  }
}
