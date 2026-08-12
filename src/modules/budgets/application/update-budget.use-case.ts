import { Injectable } from '@nestjs/common';
import { AuditEventType } from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { BudgetEntity } from '../domain/budget.entity';
import { NegativeBudgetError } from '../domain/budgets.errors';
import { IBudgetRepository } from '../domain/budgets.repository.interface';
import { UpdateBudgetDto } from '../dto/update-budget.dto';
import { FindBudgetByIdUseCase } from './find-budget-by-id.use-case';

@Injectable()
export class UpdateBudgetUseCase {
  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly findBudgetByIdUseCase: FindBudgetByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    id: string,
    companyId: string,
    userId: string,
    data: UpdateBudgetDto,
  ): Promise<BudgetEntity> {
    if (data.totalAmountCents < 0n) {
      throw new NegativeBudgetError();
    }

    return this.transactionManager.run(async (context) => {
      const current = await this.findBudgetByIdUseCase.execute(
        id,
        companyId,
        context,
      );

      await this.auditLogRepository.record(
        {
          companyId,
          actorId: userId,
          eventType: AuditEventType.BUDGET_CHANGED,
          entityType: AuditEntity.BUDGET,
          entityId: id,
          oldData: { totalAmountCents: current.totalAmountCents.toString() },
          newData: {
            totalAmountCents: data.totalAmountCents.toString(),
            changeReason: data.changeReason ?? null,
          },
        },
        context,
      );

      return this.budgetRepository.updateAmount(
        id,
        {
          totalAmountCents: data.totalAmountCents,
          changeReason: data.changeReason ?? null,
          updatedById: userId,
        },
        context,
      );
    });
  }
}
