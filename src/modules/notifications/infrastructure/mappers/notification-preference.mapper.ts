import { NotificationPreferenceModel as PrismaNotificationPreference } from 'generated/prisma/models';
import { NotificationPreferenceEntity } from '../../domain/notification.entity';

export class NotificationPreferenceMapper {
  static toDomain(
    this: void,
    raw: PrismaNotificationPreference,
  ): NotificationPreferenceEntity {
    return {
      event: raw.event,
      emailEnabled: raw.email_enabled,
    };
  }
}
