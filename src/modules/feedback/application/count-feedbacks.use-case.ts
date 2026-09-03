import { Injectable } from '@nestjs/common';
import {
  FeedbackCounters,
  IFeedbackRepository,
} from '../domain/feedbacks.repository.interface';

@Injectable()
export class CountFeedbacksUseCase {
  constructor(private readonly feedbackRepository: IFeedbackRepository) {}

  async execute(companyId?: string): Promise<FeedbackCounters> {
    return this.feedbackRepository.counters(companyId);
  }
}
