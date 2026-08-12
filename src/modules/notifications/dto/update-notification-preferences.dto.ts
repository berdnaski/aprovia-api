import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { NotificationEvent } from 'generated/prisma/enums';
import { NOTIFICATION_EVENTS } from '../domain/notification.entity';

export class NotificationPreferenceDto {
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
  @IsEnum(NotificationEvent)
  event: NotificationEvent;

  @ApiProperty()
  @IsBoolean()
  emailEnabled: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ type: [NotificationPreferenceDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(NOTIFICATION_EVENTS.length)
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceDto)
  preferences: NotificationPreferenceDto[];
}
