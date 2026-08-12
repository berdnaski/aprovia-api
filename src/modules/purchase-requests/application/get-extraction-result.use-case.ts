import { Injectable } from '@nestjs/common';
import { IExtractionResultRepository } from '../domain/extraction-results.repository.interface';
import { ExtractionResult } from '../domain/extraction.service';
import {
  FindRequestByIdUseCase,
  RequestActor,
} from './find-request-by-id.use-case';

@Injectable()
export class GetExtractionResultUseCase {
  constructor(
    private readonly extractionResultRepository: IExtractionResultRepository,
    private readonly findRequestByIdUseCase: FindRequestByIdUseCase,
  ) {}

  async execute(
    requestId: string,
    actor: RequestActor,
  ): Promise<ExtractionResult | null> {
    await this.findRequestByIdUseCase.execute(requestId, actor);

    const record = await this.extractionResultRepository.findLatest(requestId);

    if (!record) {
      return null;
    }

    return {
      status: record.status,
      fields: record.fields,
      failureReason: record.failureReason,
      extractedAt: record.completedAt,
    };
  }
}
