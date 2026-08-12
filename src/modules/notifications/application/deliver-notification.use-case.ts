import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMailService } from 'src/shared/mail/application/mail.service';
import { INotificationPreferenceRepository } from '../domain/notification-preferences.repository.interface';
import { INotificationRecipientRepository } from '../domain/notification-recipients.repository.interface';
import { renderNotification } from '../domain/notification-templates';
import { INotificationRepository } from '../domain/notifications.repository.interface';
import { NotificationJobData } from '../infrastructure/queue-notification.dispatcher';
import { renderNotificationEmail } from '../infrastructure/notification-mail.template';

@Injectable()
export class DeliverNotificationUseCase {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly preferenceRepository: INotificationPreferenceRepository,
    private readonly recipientRepository: INotificationRecipientRepository,
    private readonly mailService: IMailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(job: NotificationJobData): Promise<void> {
    const recipient = await this.recipientRepository.resolve(job.recipient);

    if (!recipient) {
      return;
    }

    const content = renderNotification(job);

    const notification = await this.notificationRepository.createIfAbsent({
      dedupeKey: job.dedupeKey,
      companyId: job.companyId,
      recipientId: recipient.userId,
      event: job.event,
      title: content.title,
      message: content.message,
      link: content.link,
    });

    if (notification.sentByEmail) {
      return;
    }

    const emailEnabled = await this.preferenceRepository.isEmailEnabled(
      recipient.userId,
      job.event,
    );

    if (!emailEnabled) {
      return;
    }

    const claimed = await this.notificationRepository.claimEmail(
      notification.id,
    );

    if (!claimed) {
      return;
    }

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );

    try {
      await this.mailService.send({
        to: recipient.email,
        ...renderNotificationEmail(recipient.name, content, frontendUrl),
      });
    } catch (error) {
      await this.notificationRepository.releaseEmail(notification.id);
      throw error;
    }
  }
}
