import { NotificationSpec } from './notification-templates';

export const RecipientKind = {
  MEMBER: 'member',
  USER: 'user',
} as const;

export type RecipientKind = (typeof RecipientKind)[keyof typeof RecipientKind];

export type NotificationRecipientRef =
  | { kind: typeof RecipientKind.MEMBER; memberId: string }
  | { kind: typeof RecipientKind.USER; userId: string };

export type DispatchNotificationInput = NotificationSpec & {
  companyId: string;
  recipient: NotificationRecipientRef;
  scope: string;
};

export abstract class INotificationDispatcher {
  abstract dispatch(input: DispatchNotificationInput): Promise<void>;

  abstract dispatchAll(inputs: DispatchNotificationInput[]): Promise<void>;
}
