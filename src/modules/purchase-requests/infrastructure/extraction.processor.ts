import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DeadLetterService } from 'src/shared/infrastructure/queue/dead-letter.service';
import { QueueName } from 'src/shared/infrastructure/queue/queue-name';
import { ExtractionJobData } from '../application/request-extraction.use-case';
import { IExtractionResultRepository } from '../domain/extraction-results.repository.interface';
import {
  ExtractionResult,
  IExtractionService,
} from '../domain/extraction.service';

@Processor(QueueName.AI_EXTRACTION)
export class ExtractionProcessor extends WorkerHost {
  private readonly logger = new Logger(ExtractionProcessor.name);

  constructor(
    private readonly extractionService: IExtractionService,
    private readonly extractionResultRepository: IExtractionResultRepository,
    private readonly deadLetterService: DeadLetterService,
  ) {
    super();
  }

  async process(job: Job<ExtractionJobData>): Promise<ExtractionResult> {
    const result = await this.extractionService.extract(job.data.companyId, {
      text: job.data.text,
      fileId: job.data.fileId,
    });

    await this.extractionResultRepository.complete(job.data.extractionId, {
      status: result.status,
      fields: result.fields,
      failureReason: result.failureReason,
    });

    this.logger.log(
      `Extração do pedido ${job.data.requestId}: ${result.status}`,
    );

    return result;
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<ExtractionJobData> | undefined,
    error: Error,
  ): Promise<void> {
    if (!job) {
      return;
    }

    await this.deadLetterService.park(QueueName.AI_EXTRACTION, job, error);
  }
}
