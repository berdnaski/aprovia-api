import { Injectable } from '@nestjs/common';
import { NotificationPreferenceEntity } from '../domain/notification.entity';
import { INotificationPreferenceRepository } from '../domain/notification-preferences.repository.interface';
import { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto';
import { GetNotificationPreferencesUseCase } from './get-notification-preferences.use-case';

@Injectable()
export class UpdateNotificationPreferencesUseCase {
  constructor(
    private readonly preferenceRepository: INotificationPreferenceRepository,
    private readonly getNotificationPreferencesUseCase: GetNotificationPreferencesUseCase,
  ) {}

  async execute(
    userId: string,
    data: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferenceEntity[]> {
    await this.preferenceRepository.setMany(userId, data.preferences);

    return this.getNotificationPreferencesUseCase.execute(userId);
  }
}
