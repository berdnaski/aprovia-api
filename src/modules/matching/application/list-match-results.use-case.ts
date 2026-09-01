import { Injectable } from '@nestjs/common';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { MatchResultEntity } from '../domain/match-result.entity';
import { IMatchResultRepository } from '../domain/matching.repository.interface';
import { ListMatchResultsQueryDto } from '../dto/list-match-results-query.dto';

@Injectable()
export class ListMatchResultsUseCase {
  constructor(private readonly matchResultRepository: IMatchResultRepository) {}

  async execute(
    companyId: string,
    query: ListMatchResultsQueryDto,
  ): Promise<Page<MatchResultEntity>> {
    return this.matchResultRepository.list({
      companyId,
      status: query.status,
      skip: query.skip,
      take: query.take,
      page: query.page,
      perPage: query.perPage,
    });
  }
}
