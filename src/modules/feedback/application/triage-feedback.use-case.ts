import { Injectable } from '@nestjs/common';
import { FeedbackEntity } from '../domain/feedback.entity';
import { FeedbackNotFoundError } from '../domain/feedback.errors';
import { IFeedbackRepository } from '../domain/feedbacks.repository.interface';
import { TriageFeedbackDto } from '../dto/triage-feedback.dto';

@Injectable()
export class TriageFeedbackUseCase {
  constructor(private readonly feedbackRepository: IFeedbackRepository) {}

  async execute(
    id: string,
    triagedById: string,
    data: TriageFeedbackDto,
  ): Promise<FeedbackEntity> {
    const existing = await this.feedbackRepository.findById(id);

    if (!existing) {
      throw new FeedbackNotFoundError();
    }

    return this.feedbackRepository.triage(id, {
      status: data.status,
      internalNote: data.internalNote?.trim() || existing.internalNote,
      reply: data.reply?.trim() || existing.reply,
      triagedById,
    });
  }
}
