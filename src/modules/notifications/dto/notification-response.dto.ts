import { ApiProperty } from '@nestjs/swagger';
import { NotificationEvent } from 'generated/prisma/enums';
import { NotificationEntity } from '../domain/notification.entity';

const EVENT_VALUES = [
  'INVITE_RECEIVED',
  'REQUEST_PENDING',
  'DECISION_MADE',
  'REQUEST_RETURNED',
  'SLA_REMINDER',
  'ESCALATED',
  'BUDGET_ALERT',
  'MONTHLY_REPORT',
];

export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: EVENT_VALUES })
  event: NotificationEvent;

  @ApiProperty({ example: 'Pedido REQ-2026-0042 aguarda sua aprovação' })
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Caminho relativo do recurso na aplicação.',
    example: '/requests/8f2c...',
  })
  link: string | null;

  @ApiProperty({
    nullable: true,
    type: Date,
    description: 'Nulo alimenta o contador de não lidas.',
  })
  readAt: Date | null;

  @ApiProperty()
  sentByEmail: boolean;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(
    this: void,
    entity: NotificationEntity,
  ): NotificationResponseDto {
    const dto = new NotificationResponseDto();

    dto.id = entity.id;
    dto.event = entity.event;
    dto.title = entity.title;
    dto.message = entity.message;
    dto.link = entity.link;
    dto.readAt = entity.readAt;
    dto.sentByEmail = entity.sentByEmail;
    dto.createdAt = entity.createdAt;

    return dto;
  }
}
