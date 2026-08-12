import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EntitlementsService } from 'src/modules/billing/application/entitlements.service';
import { PlanFeature } from 'src/modules/billing/domain/entitlements';
import { QueueName } from 'src/shared/infrastructure/queue/queue-name';
import {
  ENQUEUE_TIMEOUT_MS,
  withTimeout,
} from 'src/shared/infrastructure/queue/with-timeout';
import { IExtractionResultRepository } from '../domain/extraction-results.repository.interface';
import {
  ExtractionResult,
  ExtractionStatus,
} from '../domain/extraction.service';
import { RequestExtractionDto } from '../dto/request-extraction.dto';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from './find-request-by-id.use-case';

export interface ExtractionJobData {
  companyId: string;
  requestId: string;
  extractionId: string;
  text?: string;
  fileId?: string;
}

@Injectable()
export class RequestExtractionUseCase {
  private readonly logger = new Logger(RequestExtractionUseCase.name);

  constructor(
    @InjectQueue(QueueName.AI_EXTRACTION)
    private readonly extractionQueue: Queue<ExtractionJobData>,
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
    private readonly entitlementsService: EntitlementsService,
    private readonly extractionResultRepository: IExtractionResultRepository,
  ) {}

  async execute(
    requestId: string,
    actor: RequestActor,
    data: RequestExtractionDto,
  ): Promise<ExtractionResult> {
    await this.findRequestByIdUseCase.executeAsOwnerDraft(requestId, actor);

    await this.entitlementsService.assertFeature(
      actor.companyId,
      PlanFeature.AI_EXTRACTION,
    );

    const record = await this.extractionResultRepository.enqueue(
      requestId,
      actor.userId,
    );

    try {
      await withTimeout(
        this.extractionQueue.add('extract', {
          companyId: actor.companyId,
          requestId,
          extractionId: record.id,
          text: data.text,
          fileId: data.fileId,
        }),
        ENQUEUE_TIMEOUT_MS,
      );
    } catch (error) {
      this.logger.warn(
        `Não foi possível enfileirar a extração: ${(error as Error).message}`,
      );

      await this.extractionResultRepository.complete(record.id, {
        status: ExtractionStatus.FAILED,
        fields: null,
        failureReason:
          'A extração assistida está indisponível. Preencha os campos manualmente',
      });

      return {
        status: ExtractionStatus.FAILED,
        fields: null,
        failureReason:
          'A extração assistida está indisponível. Preencha os campos manualmente',
        extractedAt: null,
      };
    }

    return {
      status: ExtractionStatus.QUEUED,
      fields: null,
      failureReason: null,
      extractedAt: null,
    };
  }
}
