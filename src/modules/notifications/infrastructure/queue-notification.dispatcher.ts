import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { createHash } from 'node:crypto';
import { QueueName } from 'src/shared/infrastructure/queue/queue-name';
import {
  ENQUEUE_TIMEOUT_MS,
  withTimeout,
} from 'src/shared/infrastructure/queue/with-timeout';
import {
  DispatchNotificationInput,
  INotificationDispatcher,
  NotificationRecipientRef,
  RecipientKind,
} from '../domain/notification.dispatcher';

export type NotificationJobData = DispatchNotificationInput & {
  dedupeKey: string;
};

function recipientTag(recipient: NotificationRecipientRef): string {
  return recipient.kind === RecipientKind.MEMBER
    ? `member.${recipient.memberId}`
    : `user.${recipient.userId}`;
}

@Injectable()
export class QueueNotificationDispatcher implements INotificationDispatcher {
  private readonly logger = new Logger(QueueNotificationDispatcher.name);

  constructor(
    @InjectQueue(QueueName.NOTIFICATIONS)
    private readonly notificationQueue: Queue<NotificationJobData>,
  ) {}

  dispatch(input: DispatchNotificationInput): Promise<void> {
    return this.dispatchAll([input]);
  }

  async dispatchAll(inputs: DispatchNotificationInput[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }

    const jobs = inputs.map((input) => {
      const dedupeKey = `${input.event}:${input.scope}:${recipientTag(input.recipient)}`;
      const data: NotificationJobData = { ...input, dedupeKey };

      return {
        name: input.event,
        data,
        opts: { jobId: createHash('sha1').update(dedupeKey).digest('hex') },
      };
    });

    try {
      await withTimeout(
        this.notificationQueue.addBulk(jobs),
        ENQUEUE_TIMEOUT_MS,
      );
    } catch (error) {
      this.logger.error(
        `Fila indisponível: ${jobs.length} notificação(ões) não foram enfileiradas (${jobs.map((job) => job.data.dedupeKey).join(', ')}). Causa: ${(error as Error).message}`,
      );
    }
  }
}
