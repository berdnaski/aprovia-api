import { NotificationEvent } from 'generated/prisma/enums';
import { NotificationPreferenceEntity } from './notification.entity';

export interface SetNotificationPreferenceData {
  event: NotificationEvent;
  emailEnabled: boolean;
}

export abstract class INotificationPreferenceRepository {
  abstract listByUser(userId: string): Promise<NotificationPreferenceEntity[]>;

  abstract isEmailEnabled(
    userId: string,
    event: NotificationEvent,
  ): Promise<boolean>;

  abstract setMany(
    userId: string,
    preferences: SetNotificationPreferenceData[],
  ): Promise<NotificationPreferenceEntity[]>;
}
