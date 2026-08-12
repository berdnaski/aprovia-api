import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { prismaClient } from 'src/shared/infrastructure/database/prisma-transaction.manager';
import { currentIpAddress } from 'src/shared/infrastructure/http/request-context';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { AuditLogEntity, AuditValue } from '../domain/audit-log.entity';
import {
  IAuditLogRepository,
  ListAuditLogsFilter,
  RecordAuditData,
} from '../domain/audit-logs.repository.interface';
import { AuditLogMapper } from './mappers/audit-log.mapper';

type AuditPayload = Readonly<Record<string, AuditValue>> | null | undefined;

function toJson(value: AuditPayload): Prisma.InputJsonValue | undefined {
  return value ? { ...value } : undefined;
}

@Injectable()
export class AuditLogRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    data: RecordAuditData,
    context?: TransactionContext,
  ): Promise<void> {
    await prismaClient(this.prisma, context).auditLog.create({
      data: {
        company_id: data.companyId,
        actor_id: data.actorId,
        event_type: data.eventType,
        entity_type: data.entityType,
        entity_id: data.entityId,
        old_data: toJson(data.oldData),
        new_data: toJson(data.newData),
        ip_address: data.ipAddress ?? currentIpAddress(),
      },
    });
  }

  async list(
    companyId: string,
    filter: ListAuditLogsFilter,
  ): Promise<Page<AuditLogEntity>> {
    const where: Prisma.AuditLogWhereInput = {
      company_id: companyId,
      actor_id: filter.actorId,
      event_type: filter.eventType,
      entity_type: filter.entityType,
      entity_id: filter.entityId,
      occurred_at:
        filter.from || filter.to
          ? { gte: filter.from, lte: filter.to }
          : undefined,
    };

    const [records, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { occurred_at: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: records.map(AuditLogMapper.toDomain),
      total,
      page: Math.floor(filter.skip / filter.take) + 1,
      perPage: filter.take,
    };
  }
}
