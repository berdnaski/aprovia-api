import { Module } from '@nestjs/common';
import { BudgetsModule } from 'src/modules/budgets/infrastructure/budgets.module';
import { ExportRequestsUseCase } from '../application/export-requests.use-case';
import { GetDashboardUseCase } from '../application/get-dashboard.use-case';
import { IExportRowsRepository } from '../domain/export-rows.repository.interface';
import { IMetricsRepository } from '../domain/metrics.repository.interface';
import { AnalyticsController } from './analytics.controller';
import { ExportRowsRepository } from './export-rows.repository';
import { MetricsRepository } from './metrics.repository';
import { XlsxWriter } from './xlsx.writer';

@Module({
  imports: [BudgetsModule],
  controllers: [AnalyticsController],
  providers: [
    { provide: IMetricsRepository, useClass: MetricsRepository },
    { provide: IExportRowsRepository, useClass: ExportRowsRepository },
    XlsxWriter,
    GetDashboardUseCase,
    ExportRequestsUseCase,
  ],
  exports: [IMetricsRepository],
})
export class AnalyticsModule {}
