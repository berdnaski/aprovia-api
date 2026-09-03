import { Injectable } from '@nestjs/common';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { FeedbackEntity } from '../domain/feedback.entity';
import { IFeedbackRepository } from '../domain/feedbacks.repository.interface';
import { ListFeedbacksQueryDto } from '../dto/list-feedbacks-query.dto';

@Injectable()
export class ListFeedbacksUseCase {
  constructor(private readonly feedbackRepository: IFeedbackRepository) {}

  async execute(
    query: ListFeedbacksQueryDto,
    scope: { companyId?: string; authorId?: string } = {},
  ): Promise<Page<FeedbackEntity>> {
    return this.feedbackRepository.list({
      companyId: scope.companyId ?? query.companyId,
      authorId: scope.authorId,
      status: query.status,
      kind: query.kind,
      search: query.search,
      skip: query.skip,
      take: query.take,
      page: query.page,
      perPage: query.perPage,
    });
  }
}
