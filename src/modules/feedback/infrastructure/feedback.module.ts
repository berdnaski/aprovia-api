import { Module } from '@nestjs/common';
import { CountFeedbacksUseCase } from '../application/count-feedbacks.use-case';
import { GetFeedbackScreenshotUseCase } from '../application/get-feedback-screenshot.use-case';
import { ListFeedbacksUseCase } from '../application/list-feedbacks.use-case';
import { SubmitFeedbackUseCase } from '../application/submit-feedback.use-case';
import { TriageFeedbackUseCase } from '../application/triage-feedback.use-case';
import { IFeedbackRepository } from '../domain/feedbacks.repository.interface';
import { FeedbackController } from './feedback.controller';
import { FeedbackRepository } from './feedbacks.repository';
import { PlatformFeedbackController } from './platform-feedback.controller';

@Module({
  controllers: [FeedbackController, PlatformFeedbackController],
  providers: [
    { provide: IFeedbackRepository, useClass: FeedbackRepository },
    SubmitFeedbackUseCase,
    ListFeedbacksUseCase,
    CountFeedbacksUseCase,
    TriageFeedbackUseCase,
    GetFeedbackScreenshotUseCase,
  ],
  exports: [IFeedbackRepository],
})
export class FeedbackModule {}
