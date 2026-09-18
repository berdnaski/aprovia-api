import { Module } from '@nestjs/common';
import { ApplyModelChartUseCase } from '../application/apply-model-chart.use-case';
import { CreateChartAccountUseCase } from '../application/create-chart-account.use-case';
import { FindChartAccountByIdUseCase } from '../application/find-chart-account-by-id.use-case';
import { ImportChartAccountsUseCase } from '../application/import-chart-accounts.use-case';
import { ListChartAccountsUseCase } from '../application/list-chart-accounts.use-case';
import { SetChartAccountActiveUseCase } from '../application/set-chart-account-active.use-case';
import { UpdateChartAccountUseCase } from '../application/update-chart-account.use-case';
import { IChartAccountRepository } from '../domain/chart-accounts.repository.interface';
import { ChartAccountsController } from './chart-accounts.controller';
import { ChartAccountRepository } from './chart-accounts.repository';

@Module({
  controllers: [ChartAccountsController],
  providers: [
    { provide: IChartAccountRepository, useClass: ChartAccountRepository },
    ListChartAccountsUseCase,
    FindChartAccountByIdUseCase,
    CreateChartAccountUseCase,
    UpdateChartAccountUseCase,
    SetChartAccountActiveUseCase,
    ImportChartAccountsUseCase,
    ApplyModelChartUseCase,
  ],
  exports: [
    IChartAccountRepository,
    FindChartAccountByIdUseCase,
    ApplyModelChartUseCase,
  ],
})
export class ChartAccountsModule {}
