import { Page } from 'src/shared/dto/pagination-query.dto';
import { WaitlistEntryEntity } from './waitlist.entity';

export interface CreateWaitlistData {
  email: string;
  name: string | null;
  company: string | null;
  source: string | null;
}

export interface ListWaitlistFilter {
  search?: string;
  skip: number;
  take: number;
  page: number;
  perPage: number;
}

export abstract class IWaitlistRepository {
  abstract create(data: CreateWaitlistData): Promise<WaitlistEntryEntity>;

  abstract findByEmail(email: string): Promise<WaitlistEntryEntity | null>;

  abstract list(filter: ListWaitlistFilter): Promise<Page<WaitlistEntryEntity>>;

  abstract count(): Promise<number>;
}
