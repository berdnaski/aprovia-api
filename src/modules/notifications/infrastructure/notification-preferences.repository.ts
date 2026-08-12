import { Injectable } from '@nestjs/common';
import { NotificationEvent } from 'generated/prisma/enums';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import { NotificationPreferenceEntity } from '../domain/notification.entity';
import {
  INotificationPreferenceRepository,
  SetNotificationPreferenceData,
} from '../domain/notification-preferences.repository.interface';
import { NotificationPreferenceMapper } from './mappers/notification-preference.mapper';

@Injectable()
export class NotificationPreferenceRepository implements INotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByUser(userId: string): Promise<NotificationPreferenceEntity[]> {
    const records = await this.prisma.notificationPreference.findMany({
      where: { user_id: userId },
    });

    return records.map(NotificationPreferenceMapper.toDomain);
  }

  async isEmailEnabled(
    userId: string,
    event: NotificationEvent,
  ): Promise<boolean> {
    const record = await this.prisma.notificationPreference.findUnique({
      where: { user_id_event: { user_id: userId, event } },
      select: { email_enabled: true },
    });

    return record?.email_enabled ?? true;
  }

  async setMany(
    userId: string,
    preferences: SetNotificationPreferenceData[],
  ): Promise<NotificationPreferenceEntity[]> {
    const records = await this.prisma.$transaction(
      preferences.map((preference) =>
        this.prisma.notificationPreference.upsert({
          where: {
            user_id_event: { user_id: userId, event: preference.event },
          },
          create: {
            user_id: userId,
            event: preference.event,
            email_enabled: preference.emailEnabled,
          },
          update: { email_enabled: preference.emailEnabled },
        }),
      ),
    );

    return records.map(NotificationPreferenceMapper.toDomain);
  }
}
