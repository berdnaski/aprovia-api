import { NotificationEvent } from 'generated/prisma/enums';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { NotificationEntity } from './notification.entity';

export interface CreateNotificationData {
  dedupeKey: string;
  companyId: string;
  recipientId: string;
  event: NotificationEvent;
  title: string;
  message: string;
  link: string | null;
}

export interface ListNotificationsFilter {
  companyId: string;
  unreadOnly: boolean;
  skip: number;
  take: number;
}

export abstract class INotificationRepository {
  abstract createIfAbsent(
    data: CreateNotificationData,
  ): Promise<NotificationEntity>;

  abstract claimEmail(id: string): Promise<boolean>;

  abstract releaseEmail(id: string): Promise<void>;

  abstract list(
    recipientId: string,
    filter: ListNotificationsFilter,
  ): Promise<Page<NotificationEntity>>;

  abstract countUnread(recipientId: string, companyId: string): Promise<number>;

  abstract markAsRead(id: string, recipientId: string): Promise<boolean>;

  abstract markAllAsRead(
    recipientId: string,
    companyId: string,
  ): Promise<number>;
}
