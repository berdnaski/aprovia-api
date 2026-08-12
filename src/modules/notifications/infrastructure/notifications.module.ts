import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { QueueName } from 'src/shared/infrastructure/queue/queue-name';
import { CountUnreadNotificationsUseCase } from '../application/count-unread-notifications.use-case';
import { DeliverNotificationUseCase } from '../application/deliver-notification.use-case';
import { GetNotificationPreferencesUseCase } from '../application/get-notification-preferences.use-case';
import { ListNotificationsUseCase } from '../application/list-notifications.use-case';
import { MarkNotificationsReadUseCase } from '../application/mark-notifications-read.use-case';
import { UpdateNotificationPreferencesUseCase } from '../application/update-notification-preferences.use-case';
import { INotificationPreferenceRepository } from '../domain/notification-preferences.repository.interface';
import { INotificationRecipientRepository } from '../domain/notification-recipients.repository.interface';
import { INotificationDispatcher } from '../domain/notification.dispatcher';
import { INotificationRepository } from '../domain/notifications.repository.interface';
import { NotificationPreferenceRepository } from './notification-preferences.repository';
import { NotificationRecipientRepository } from './notification-recipients.repository';
import { NotificationsController } from './notifications.controller';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationRepository } from './notifications.repository';
import { QueueNotificationDispatcher } from './queue-notification.dispatcher';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({ name: QueueName.NOTIFICATIONS }),
    BullModule.registerQueue({ name: QueueName.DEAD_LETTER }),
  ],
  controllers: [NotificationsController],
  providers: [
    { provide: INotificationRepository, useClass: NotificationRepository },
    {
      provide: INotificationPreferenceRepository,
      useClass: NotificationPreferenceRepository,
    },
    {
      provide: INotificationRecipientRepository,
      useClass: NotificationRecipientRepository,
    },
    { provide: INotificationDispatcher, useClass: QueueNotificationDispatcher },
    ListNotificationsUseCase,
    CountUnreadNotificationsUseCase,
    MarkNotificationsReadUseCase,
    GetNotificationPreferencesUseCase,
    UpdateNotificationPreferencesUseCase,
    DeliverNotificationUseCase,
    NotificationsProcessor,
  ],
  exports: [INotificationDispatcher, INotificationRecipientRepository],
})
export class NotificationsModule {}
