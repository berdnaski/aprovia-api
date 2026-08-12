import { NotificationRecipient } from './notification.entity';
import { NotificationRecipientRef } from './notification.dispatcher';

export abstract class INotificationRecipientRepository {
  abstract resolve(
    ref: NotificationRecipientRef,
  ): Promise<NotificationRecipient | null>;

  abstract listFinanceAdmins(
    companyId: string,
  ): Promise<{ memberId: string }[]>;
}
