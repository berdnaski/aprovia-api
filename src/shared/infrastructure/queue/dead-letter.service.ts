import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { QueueName } from './queue-name';
import { ENQUEUE_TIMEOUT_MS, withTimeout } from './with-timeout';

export interface DeadLetterJobData {
  queue: QueueName;
  jobId: string;
  jobName: string;
  payload: unknown;
  reason: string;
  attempts: number;
  failedAt: string;
}

@Injectable()
export class DeadLetterService {
  private readonly logger = new Logger(DeadLetterService.name);

  constructor(
    @InjectQueue(QueueName.DEAD_LETTER)
    private readonly deadLetterQueue: Queue<DeadLetterJobData>,
  ) {}

  async park(queue: QueueName, job: Job<unknown>, error: Error): Promise<void> {
    const attempts = job.opts.attempts ?? 1;

    if (job.attemptsMade < attempts) {
      return;
    }

    const entry: DeadLetterJobData = {
      queue,
      jobId: job.id ?? 'desconhecido',
      jobName: job.name,
      payload: job.data,
      reason: error.message,
      attempts,
      failedAt: new Date().toISOString(),
    };

    this.logger.error(
      `Job ${job.name} da fila ${queue} esgotou ${attempts} tentativas e foi para a dead-letter: ${error.message}`,
    );

    try {
      await withTimeout(
        this.deadLetterQueue.add(queue, entry),
        ENQUEUE_TIMEOUT_MS,
      );
    } catch (parkError) {
      this.logger.error(
        `Dead-letter indisponível: o job ${job.name} da fila ${queue} se perdeu. Causa original: ${error.message}. Causa do parking: ${(parkError as Error).message}`,
      );
    }
  }
}
