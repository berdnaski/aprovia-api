import { Injectable } from '@nestjs/common';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { WaitlistEntryEntity } from '../domain/waitlist.entity';
import { IWaitlistRepository } from '../domain/waitlist.repository.interface';
import { ListWaitlistQueryDto } from '../dto/list-waitlist-query.dto';

@Injectable()
export class ListWaitlistUseCase {
  constructor(private readonly waitlistRepository: IWaitlistRepository) {}

  async execute(
    query: ListWaitlistQueryDto,
  ): Promise<Page<WaitlistEntryEntity>> {
    return this.waitlistRepository.list({
      search: query.search,
      skip: query.skip,
      take: query.take,
      page: query.page,
      perPage: query.perPage,
    });
  }
}
