import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DeadLetterService } from 'src/shared/infrastructure/queue/dead-letter.service';
import { QueueName } from 'src/shared/infrastructure/queue/queue-name';
import { DeliverNotificationUseCase } from '../application/deliver-notification.use-case';
import { NotificationJobData } from './queue-notification.dispatcher';

@Processor(QueueName.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  constructor(
    private readonly deliverNotificationUseCase: DeliverNotificationUseCase,
    private readonly deadLetterService: DeadLetterService,
  ) {
    super();
  }

  process(job: Job<NotificationJobData>): Promise<void> {
    return this.deliverNotificationUseCase.execute(job.data);
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<NotificationJobData> | undefined,
    error: Error,
  ): Promise<void> {
    if (!job) {
      return;
    }

    await this.deadLetterService.park(QueueName.NOTIFICATIONS, job, error);
  }
}
