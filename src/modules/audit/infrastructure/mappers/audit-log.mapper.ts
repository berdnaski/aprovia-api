import { AuditLogModel as PrismaAuditLog } from 'generated/prisma/models';
import { AuditLogEntity, AuditValue } from '../../domain/audit-log.entity';

export class AuditLogMapper {
  static toDomain(this: void, raw: PrismaAuditLog): AuditLogEntity {
    return {
      id: raw.id,
      companyId: raw.company_id,
      actorId: raw.actor_id,
      eventType: raw.event_type,
      entityType: raw.entity_type,
      entityId: raw.entity_id,
      oldData: raw.old_data as Record<string, AuditValue> | null,
      newData: raw.new_data as Record<string, AuditValue> | null,
      ipAddress: raw.ip_address,
      occurredAt: raw.occurred_at,
    };
  }
}
