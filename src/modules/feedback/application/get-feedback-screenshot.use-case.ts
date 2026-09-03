import { Injectable } from '@nestjs/common';
import { IStorageService } from 'src/shared/domain/storage.service';
import { FeedbackNotFoundError } from '../domain/feedback.errors';
import { IFeedbackRepository } from '../domain/feedbacks.repository.interface';

@Injectable()
export class GetFeedbackScreenshotUseCase {
  constructor(
    private readonly feedbackRepository: IFeedbackRepository,
    private readonly storageService: IStorageService,
  ) {}

  async execute(id: string): Promise<string> {
    const feedback = await this.feedbackRepository.findById(id);

    if (!feedback?.screenshotKey) {
      throw new FeedbackNotFoundError();
    }

    return this.storageService.getSignedDownloadUrl(
      feedback.screenshotKey,
      `feedback-${feedback.id}.png`,
    );
  }
}
