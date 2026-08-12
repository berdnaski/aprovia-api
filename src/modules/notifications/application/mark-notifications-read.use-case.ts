import { Injectable } from '@nestjs/common';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { INotificationRepository } from '../domain/notifications.repository.interface';

@Injectable()
export class MarkNotificationsReadUseCase {
  constructor(
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const belongsToUser = await this.notificationRepository.markAsRead(
      id,
      userId,
    );

    if (!belongsToUser) {
      throw new NotFoundError('Notificação', id);
    }
  }

  executeAll(userId: string, companyId: string): Promise<number> {
    return this.notificationRepository.markAllAsRead(userId, companyId);
  }
}
