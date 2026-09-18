import { Injectable } from '@nestjs/common';
import { AuditEventType } from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import {
  ITransactionManager,
  TransactionContext,
} from 'src/shared/domain/transaction.manager';
import { ChartImportError } from '../domain/chart-accounts.errors';
import { IChartAccountRepository } from '../domain/chart-accounts.repository.interface';
import { parseChartCsv } from '../domain/services/chart-csv.parser';
import {
  ChartImportRow,
  planChartImport,
} from '../domain/services/chart-import.planner';

export interface ChartImportOutcome {
  created: number;
  updated: number;
  codeToId: ReadonlyMap<string, string>;
}

@Injectable()
export class ImportChartAccountsUseCase {
  constructor(
    private readonly chartAccountRepository: IChartAccountRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  execute(
    companyId: string,
    userId: string,
    content: string,
  ): Promise<ChartImportOutcome> {
    const parsed = parseChartCsv(content);

    if (parsed.problems.length > 0) {
      throw new ChartImportError(parsed.problems);
    }

    return this.transactionManager.run((context) =>
      this.importRows(companyId, userId, parsed.rows, context),
    );
  }

  async importRows(
    companyId: string,
    userId: string | null,
    rows: ChartImportRow[],
    context: TransactionContext,
  ): Promise<ChartImportOutcome> {
    const existing = await this.chartAccountRepository.list(
      companyId,
      { includeInactive: true },
      context,
    );
    const plan = planChartImport(existing, rows);

    if (plan.problems.length > 0) {
      throw new ChartImportError(plan.problems);
    }

    const codeToId = new Map(
      existing.map((account) => [account.code, account.id]),
    );

    for (const account of plan.creates) {
      const created = await this.chartAccountRepository.create(
        {
          companyId,
          parentId: account.parentCode
            ? (codeToId.get(account.parentCode) ?? null)
            : null,
          code: account.code,
          name: account.name,
          kind: account.kind,
          postable: account.postable,
          externalCode: account.externalCode,
        },
        context,
      );
      codeToId.set(created.code, created.id);
    }

    for (const update of plan.updates) {
      await this.chartAccountRepository.update(
        update.id,
        { name: update.name, externalCode: update.externalCode },
        context,
      );
    }

    await this.auditLogRepository.record(
      {
        companyId,
        actorId: userId,
        eventType: AuditEventType.ACCOUNTS_CHANGED,
        entityType: AuditEntity.CHART_ACCOUNT,
        entityId: companyId,
        newData: {
          imported: true,
          created: plan.creates.length,
          updated: plan.updates.length,
        },
      },
      context,
    );

    return {
      created: plan.creates.length,
      updated: plan.updates.length,
      codeToId,
    };
  }
}
