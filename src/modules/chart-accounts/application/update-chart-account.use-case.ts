import { Injectable } from '@nestjs/common';
import { AuditEventType } from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { ChartAccountEntity } from '../domain/chart-account.entity';
import { AccountWithChildrenError } from '../domain/chart-accounts.errors';
import { IChartAccountRepository } from '../domain/chart-accounts.repository.interface';
import { UpdateChartAccountDto } from '../dto/update-chart-account.dto';
import { FindChartAccountByIdUseCase } from './find-chart-account-by-id.use-case';

@Injectable()
export class UpdateChartAccountUseCase {
  constructor(
    private readonly chartAccountRepository: IChartAccountRepository,
    private readonly findChartAccountByIdUseCase: FindChartAccountByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  execute(
    id: string,
    companyId: string,
    userId: string,
    data: UpdateChartAccountDto,
  ): Promise<ChartAccountEntity> {
    return this.transactionManager.run(async (context) => {
      const current = await this.findChartAccountByIdUseCase.execute(
        id,
        companyId,
        context,
      );

      if (data.postable === true && !current.postable) {
        const children = await this.chartAccountRepository.countActiveChildren(
          id,
          context,
        );

        if (children > 0) {
          throw new AccountWithChildrenError(current.code);
        }
      }

      const updated = await this.chartAccountRepository.update(
        id,
        {
          name: data.name?.trim(),
          externalCode:
            data.externalCode === undefined
              ? undefined
              : data.externalCode?.trim() || null,
          postable: data.postable,
        },
        context,
      );

      await this.auditLogRepository.record(
        {
          companyId,
          actorId: userId,
          eventType: AuditEventType.ACCOUNTS_CHANGED,
          entityType: AuditEntity.CHART_ACCOUNT,
          entityId: id,
          oldData: {
            name: current.name,
            externalCode: current.externalCode,
            postable: current.postable,
          },
          newData: {
            name: updated.name,
            externalCode: updated.externalCode,
            postable: updated.postable,
          },
        },
        context,
      );

      return updated;
    });
  }
}
