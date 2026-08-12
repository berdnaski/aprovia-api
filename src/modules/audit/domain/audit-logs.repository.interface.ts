import { AuditEventType } from 'generated/prisma/enums';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { AuditLogEntity, AuditValue } from './audit-log.entity';

export interface RecordAuditData {
  companyId: string;
  actorId: string | null;
  eventType: AuditEventType;
  entityType: string;
  entityId: string;
  oldData?: Readonly<Record<string, AuditValue>> | null;
  newData?: Readonly<Record<string, AuditValue>> | null;
  ipAddress?: string | null;
}

export interface ListAuditLogsFilter {
  actorId?: string;
  eventType?: AuditEventType;
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  skip: number;
  take: number;
}

export abstract class IAuditLogRepository {
  abstract record(
    data: RecordAuditData,
    context?: TransactionContext,
  ): Promise<void>;

  abstract list(
    companyId: string,
    filter: ListAuditLogsFilter,
  ): Promise<Page<AuditLogEntity>>;
}
