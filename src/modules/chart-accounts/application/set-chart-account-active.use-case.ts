import { Injectable } from '@nestjs/common';
import { AuditEventType } from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { ChartAccountEntity } from '../domain/chart-account.entity';
import {
  AccountWithChildrenError,
  InactiveAccountError,
} from '../domain/chart-accounts.errors';
import { IChartAccountRepository } from '../domain/chart-accounts.repository.interface';
import { FindChartAccountByIdUseCase } from './find-chart-account-by-id.use-case';

@Injectable()
export class SetChartAccountActiveUseCase {
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
    active: boolean,
  ): Promise<ChartAccountEntity> {
    return this.transactionManager.run(async (context) => {
      const account = await this.findChartAccountByIdUseCase.execute(
        id,
        companyId,
        context,
      );

      if (account.active === active) {
        return account;
      }

      if (!active) {
        const children = await this.chartAccountRepository.countActiveChildren(
          id,
          context,
        );

        if (children > 0) {
          throw new AccountWithChildrenError(account.code);
        }
      }

      if (active && account.parentId) {
        const parent = await this.findChartAccountByIdUseCase.execute(
          account.parentId,
          companyId,
          context,
        );

        if (!parent.active) {
          throw new InactiveAccountError(parent.code);
        }
      }

      const updated = await this.chartAccountRepository.setActive(
        id,
        active,
        context,
      );

      await this.auditLogRepository.record(
        {
          companyId,
          actorId: userId,
          eventType: AuditEventType.ACCOUNTS_CHANGED,
          entityType: AuditEntity.CHART_ACCOUNT,
          entityId: id,
          oldData: { active: account.active },
          newData: { active },
        },
        context,
      );

      return updated;
    });
  }
}
