import { NotificationModel as PrismaNotification } from 'generated/prisma/models';
import { NotificationEntity } from '../../domain/notification.entity';

export class NotificationMapper {
  static toDomain(this: void, raw: PrismaNotification): NotificationEntity {
    return {
      id: raw.id,
      companyId: raw.company_id,
      recipientId: raw.recipient_id,
      event: raw.event,
      title: raw.title,
      message: raw.message,
      link: raw.link,
      readAt: raw.read_at,
      sentByEmail: raw.sent_by_email,
      createdAt: raw.created_at,
    };
  }
}
