import { Injectable } from '@nestjs/common';
import { FindChartAccountByIdUseCase } from 'src/modules/chart-accounts/application/find-chart-account-by-id.use-case';
import { assertAcceptsPurchases } from 'src/modules/chart-accounts/domain/services/chart-account-rules';

@Injectable()
export class ResolveDefaultAccountUseCase {
  constructor(
    private readonly findChartAccountByIdUseCase: FindChartAccountByIdUseCase,
  ) {}

  async execute(
    accountId: string | null | undefined,
    companyId: string,
  ): Promise<string | null | undefined> {
    if (!accountId) {
      return accountId;
    }

    const account = await this.findChartAccountByIdUseCase.execute(
      accountId,
      companyId,
    );
    assertAcceptsPurchases(account);

    return account.id;
  }
}
