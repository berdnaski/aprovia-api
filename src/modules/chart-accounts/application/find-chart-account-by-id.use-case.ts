import { Injectable } from '@nestjs/common';
import {
  ForbiddenError,
  NotFoundError,
} from 'src/shared/domain/errors/domain.error';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { ChartAccountEntity } from '../domain/chart-account.entity';
import { IChartAccountRepository } from '../domain/chart-accounts.repository.interface';

@Injectable()
export class FindChartAccountByIdUseCase {
  constructor(
    private readonly chartAccountRepository: IChartAccountRepository,
  ) {}

  async execute(
    id: string,
    companyId: string,
    context?: TransactionContext,
  ): Promise<ChartAccountEntity> {
    const account = await this.chartAccountRepository.findById(id, context);

    if (!account) {
      throw new NotFoundError('Conta contábil', id);
    }

    if (account.companyId !== companyId) {
      throw new ForbiddenError('Esta conta contábil pertence a outra empresa');
    }

    return account;
  }
}
