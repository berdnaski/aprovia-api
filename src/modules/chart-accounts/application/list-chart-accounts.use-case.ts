import { Injectable } from '@nestjs/common';
import { ChartAccountEntity } from '../domain/chart-account.entity';
import {
  IChartAccountRepository,
  ListChartAccountsFilter,
} from '../domain/chart-accounts.repository.interface';

@Injectable()
export class ListChartAccountsUseCase {
  constructor(
    private readonly chartAccountRepository: IChartAccountRepository,
  ) {}

  execute(
    companyId: string,
    filter?: ListChartAccountsFilter,
  ): Promise<ChartAccountEntity[]> {
    return this.chartAccountRepository.list(companyId, filter);
  }
}
