import { Injectable } from '@nestjs/common';
import { AuditEventType } from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { ITransactionManager } from 'src/shared/domain/transaction.manager';
import { ChartAccountEntity } from '../domain/chart-account.entity';
import {
  isValidAccountCode,
  normalizeAccountCode,
} from '../domain/chart-account-code';
import {
  ChartAccountCodeTakenError,
  InactiveAccountError,
  InvalidAccountCodeError,
} from '../domain/chart-accounts.errors';
import { IChartAccountRepository } from '../domain/chart-accounts.repository.interface';
import { assertFitsUnderParent } from '../domain/services/chart-account-rules';
import { CreateChartAccountDto } from '../dto/create-chart-account.dto';
import { FindChartAccountByIdUseCase } from './find-chart-account-by-id.use-case';

@Injectable()
export class CreateChartAccountUseCase {
  constructor(
    private readonly chartAccountRepository: IChartAccountRepository,
    private readonly findChartAccountByIdUseCase: FindChartAccountByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(
    companyId: string,
    userId: string,
    data: CreateChartAccountDto,
  ): Promise<ChartAccountEntity> {
    const code = normalizeAccountCode(data.code);

    if (!isValidAccountCode(code)) {
      throw new InvalidAccountCodeError(data.code);
    }

    try {
      return await this.transactionManager.run(async (context) => {
        const parent = data.parentId
          ? await this.findChartAccountByIdUseCase.execute(
              data.parentId,
              companyId,
              context,
            )
          : null;

        const kind = data.kind ?? parent?.kind;

        if (!kind) {
          throw new ValidationError('Informe a natureza da conta.');
        }

        if (parent) {
          if (!parent.active) {
            throw new InactiveAccountError(parent.code);
          }

          assertFitsUnderParent(code, kind, parent);
        }

        const account = await this.chartAccountRepository.create(
          {
            companyId,
            parentId: parent?.id ?? null,
            code,
            name: data.name.trim(),
            kind,
            postable: data.postable,
            externalCode: data.externalCode?.trim() || null,
          },
          context,
        );

        await this.auditLogRepository.record(
          {
            companyId,
            actorId: userId,
            eventType: AuditEventType.ACCOUNTS_CHANGED,
            entityType: AuditEntity.CHART_ACCOUNT,
            entityId: account.id,
            newData: {
              code: account.code,
              name: account.name,
              kind: account.kind,
              postable: account.postable,
            },
          },
          context,
        );

        return account;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ChartAccountCodeTakenError(code);
      }
      throw error;
    }
  }
}
