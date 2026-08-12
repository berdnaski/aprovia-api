import { Injectable } from '@nestjs/common';
import {
  NOTIFICATION_EVENTS,
  NotificationPreferenceEntity,
} from '../domain/notification.entity';
import { INotificationPreferenceRepository } from '../domain/notification-preferences.repository.interface';

@Injectable()
export class GetNotificationPreferencesUseCase {
  constructor(
    private readonly preferenceRepository: INotificationPreferenceRepository,
  ) {}

  async execute(userId: string): Promise<NotificationPreferenceEntity[]> {
    const stored = await this.preferenceRepository.listByUser(userId);
    const disabled = new Set(
      stored
        .filter((preference) => !preference.emailEnabled)
        .map((preference) => preference.event),
    );

    return NOTIFICATION_EVENTS.map((event) => ({
      event,
      emailEnabled: !disabled.has(event),
    }));
  }
}
