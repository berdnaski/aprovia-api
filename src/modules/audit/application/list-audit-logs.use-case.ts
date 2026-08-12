import { Injectable } from '@nestjs/common';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { AuditLogEntity } from '../domain/audit-log.entity';
import { IAuditLogRepository } from '../domain/audit-logs.repository.interface';
import { ListAuditLogsQueryDto } from '../dto/list-audit-logs-query.dto';

@Injectable()
export class ListAuditLogsUseCase {
  constructor(private readonly auditLogRepository: IAuditLogRepository) {}

  execute(
    companyId: string,
    query: ListAuditLogsQueryDto,
  ): Promise<Page<AuditLogEntity>> {
    return this.auditLogRepository.list(companyId, {
      actorId: query.actorId,
      eventType: query.eventType,
      entityType: query.entityType,
      entityId: query.entityId,
      from: query.from,
      to: query.to,
      skip: query.skip,
      take: query.take,
    });
  }
}
