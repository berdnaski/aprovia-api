import { Injectable } from '@nestjs/common';
import { INotificationRepository } from '../domain/notifications.repository.interface';

@Injectable()
export class CountUnreadNotificationsUseCase {
  constructor(
    private readonly notificationRepository: INotificationRepository,
  ) {}

  execute(userId: string, companyId: string): Promise<number> {
    return this.notificationRepository.countUnread(userId, companyId);
  }
}
