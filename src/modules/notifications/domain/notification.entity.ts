import { NotificationEvent } from 'generated/prisma/enums';

export const NOTIFICATION_EVENTS: readonly NotificationEvent[] = [
  NotificationEvent.INVITE_RECEIVED,
  NotificationEvent.REQUEST_PENDING,
  NotificationEvent.DECISION_MADE,
  NotificationEvent.REQUEST_RETURNED,
  NotificationEvent.SLA_REMINDER,
  NotificationEvent.ESCALATED,
  NotificationEvent.BUDGET_ALERT,
  NotificationEvent.MONTHLY_REPORT,
];

export interface NotificationEntity {
  id: string;
  companyId: string;
  recipientId: string;
  event: NotificationEvent;
  title: string;
  message: string;
  link: string | null;
  readAt: Date | null;
  sentByEmail: boolean;
  createdAt: Date;
}

export interface NotificationPreferenceEntity {
  event: NotificationEvent;
  emailEnabled: boolean;
}

export interface NotificationRecipient {
  userId: string;
  name: string;
  email: string;
}
