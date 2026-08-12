import { ApiProperty } from '@nestjs/swagger';
import { AuditEventType } from 'generated/prisma/enums';
import { AuditLogEntity, AuditValue } from '../domain/audit-log.entity';

export class AuditLogResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    type: String,
    description: 'Nulo indica ação automática do agendador.',
  })
  actorId: string | null;

  @ApiProperty({
    enum: [
      'CREATED',
      'SUBMITTED',
      'APPROVED',
      'REJECTED',
      'CHANGES_REQUESTED',
      'CANCELED',
      'REASSIGNED',
      'ESCALATED',
      'RULES_CHANGED',
      'BUDGET_CHANGED',
      'MEMBER_CHANGED',
    ],
  })
  eventType: AuditEventType;

  @ApiProperty({ example: 'purchase_request' })
  entityType: string;

  @ApiProperty({
    description:
      'Sem FK de propósito: o log sobrevive à remoção do registro original.',
  })
  entityId: string;

  @ApiProperty({ nullable: true, type: Object })
  oldData: Readonly<Record<string, AuditValue>> | null;

  @ApiProperty({ nullable: true, type: Object })
  newData: Readonly<Record<string, AuditValue>> | null;

  @ApiProperty({ nullable: true, type: String })
  ipAddress: string | null;

  @ApiProperty()
  occurredAt: Date;

  static fromEntity(this: void, entity: AuditLogEntity): AuditLogResponseDto {
    const dto = new AuditLogResponseDto();

    dto.id = entity.id;
    dto.actorId = entity.actorId;
    dto.eventType = entity.eventType;
    dto.entityType = entity.entityType;
    dto.entityId = entity.entityId;
    dto.oldData = entity.oldData;
    dto.newData = entity.newData;
    dto.ipAddress = entity.ipAddress;
    dto.occurredAt = entity.occurredAt;

    return dto;
  }
}
