import { ApiProperty } from '@nestjs/swagger';
import { NotificationEvent } from 'generated/prisma/enums';
import { NotificationPreferenceEntity } from '../domain/notification.entity';

export class NotificationPreferenceResponseDto {
  @ApiProperty({
    enum: [
      'INVITE_RECEIVED',
      'REQUEST_PENDING',
      'DECISION_MADE',
      'REQUEST_RETURNED',
      'SLA_REMINDER',
      'ESCALATED',
      'BUDGET_ALERT',
      'MONTHLY_REPORT',
    ],
  })
  event: NotificationEvent;

  @ApiProperty({
    description: 'A notificação na central independe desta escolha.',
  })
  emailEnabled: boolean;

  static fromEntity(
    this: void,
    entity: NotificationPreferenceEntity,
  ): NotificationPreferenceResponseDto {
    const dto = new NotificationPreferenceResponseDto();

    dto.event = entity.event;
    dto.emailEnabled = entity.emailEnabled;

    return dto;
  }

  static fromEntities(
    entities: NotificationPreferenceEntity[],
  ): NotificationPreferenceResponseDto[] {
    return entities.map(NotificationPreferenceResponseDto.fromEntity);
  }
}
