import { Injectable } from '@nestjs/common';
import { AuditEventType } from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { RecurringContractEntity } from '../domain/recurring-contract.entity';
import { RecurringContractAlreadyCanceledError } from '../domain/recurring-contracts.errors';
import { IRecurringContractRepository } from '../domain/recurring-contracts.repository.interface';
import { FindRecurringContractByIdUseCase } from './find-recurring-contract-by-id.use-case';

const MIN_REASON = 10;

@Injectable()
export class CancelRecurringContractUseCase {
  constructor(
    private readonly recurringContractRepository: IRecurringContractRepository,
    private readonly findRecurringContractByIdUseCase: FindRecurringContractByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    id: string,
    companyId: string,
    userId: string,
    reason: string,
  ): Promise<RecurringContractEntity> {
    const contract = await this.findRecurringContractByIdUseCase.execute(
      id,
      companyId,
    );

    if (!contract.active) {
      throw new RecurringContractAlreadyCanceledError();
    }

    if (reason.trim().length < MIN_REASON) {
      throw new ValidationError(
        `O motivo do cancelamento precisa de ao menos ${MIN_REASON} caracteres.`,
      );
    }

    return this.transactionManager.run(async (context) => {
      const canceled = await this.recurringContractRepository.cancel(
        id,
        { canceledAt: new Date(), cancelReason: reason.trim() },
        context,
      );

      await this.auditLogRepository.record(
        {
          companyId,
          actorId: userId,
          eventType: AuditEventType.RECURRING_CONTRACT_CANCELED,
          entityType: AuditEntity.RECURRING_CONTRACT,
          entityId: id,
          newData: { reason: reason.trim() },
        },
        context,
      );

      return canceled;
    });
  }
}
