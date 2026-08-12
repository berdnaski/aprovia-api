import { Injectable, Logger } from '@nestjs/common';
import { NotificationEvent } from 'generated/prisma/enums';
import {
  DispatchNotificationInput,
  INotificationDispatcher,
  RecipientKind,
} from 'src/modules/notifications/domain/notification.dispatcher';
import { ISlaStepRepository } from 'src/modules/purchase-requests/domain/sla-steps.repository.interface';

const BATCH_SIZE = 200;

@Injectable()
export class SendSlaRemindersUseCase {
  private readonly logger = new Logger(SendSlaRemindersUseCase.name);

  constructor(
    private readonly slaStepRepository: ISlaStepRepository,
    private readonly notificationDispatcher: INotificationDispatcher,
  ) {}

  async execute(now: Date = new Date()): Promise<number> {
    const due = await this.slaStepRepository.listDueForReminder(
      now,
      BATCH_SIZE,
    );

    const notifications: DispatchNotificationInput[] = [];

    for (const step of due) {
      const claimed = await this.slaStepRepository.clearReminder(
        step.stepId,
        step.dueAt,
      );

      if (!claimed) {
        continue;
      }

      notifications.push({
        companyId: step.companyId,
        event: NotificationEvent.SLA_REMINDER,
        recipient: {
          kind: RecipientKind.MEMBER,
          memberId: step.expectedApproverId,
        },
        scope: step.stepId,
        params: {
          requestId: step.requestId,
          number: step.number,
          requestTitle: step.title,
          amountCents: step.totalAmountCents.toString(),
          dueAt: step.dueAt.toISOString(),
        },
      });
    }

    await this.notificationDispatcher.dispatchAll(notifications);

    if (notifications.length > 0) {
      this.logger.log(`Lembretes de SLA enviados: ${notifications.length}`);
    }

    return notifications.length;
  }
}
