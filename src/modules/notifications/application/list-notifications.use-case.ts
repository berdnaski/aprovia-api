import { Injectable } from '@nestjs/common';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { NotificationEntity } from '../domain/notification.entity';
import { INotificationRepository } from '../domain/notifications.repository.interface';
import { ListNotificationsQueryDto } from '../dto/list-notifications-query.dto';

@Injectable()
export class ListNotificationsUseCase {
  constructor(
    private readonly notificationRepository: INotificationRepository,
  ) {}

  execute(
    userId: string,
    companyId: string,
    query: ListNotificationsQueryDto,
  ): Promise<Page<NotificationEntity>> {
    return this.notificationRepository.list(userId, {
      companyId,
      unreadOnly: query.unreadOnly ?? false,
      skip: query.skip,
      take: query.take,
    });
  }
}
