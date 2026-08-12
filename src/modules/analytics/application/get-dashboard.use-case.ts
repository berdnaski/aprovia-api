import { Injectable } from '@nestjs/common';
import { BudgetPeriodService } from 'src/modules/budgets/domain/services/budget-period.service';
import { DashboardMetrics } from '../domain/metrics';
import { IMetricsRepository } from '../domain/metrics.repository.interface';
import { DashboardQueryDto } from '../dto/dashboard-query.dto';

const DEFAULT_WINDOW_DAYS = 90;

@Injectable()
export class GetDashboardUseCase {
  constructor(
    private readonly metricsRepository: IMetricsRepository,
    private readonly budgetPeriodService: BudgetPeriodService,
  ) {}

  async execute(
    companyId: string,
    query: DashboardQueryDto,
  ): Promise<DashboardMetrics> {
    const to = query.to ?? new Date();
    const from =
      query.from ??
      new Date(to.getTime() - DEFAULT_WINDOW_DAYS * 24 * 3600 * 1000);

    const window = { companyId, from, to };
    const period = query.period
      ? this.budgetPeriodService.fromMonthKey(query.period)
      : this.budgetPeriodService.current(to);

    const [totals, consumption, approvers, costCenters, bottlenecks, repeated] =
      await Promise.all([
        this.metricsRepository.statusTotals(window),
        this.metricsRepository.costCenterConsumption(
          companyId,
          period.periodStart,
        ),
        this.metricsRepository.approverPerformance(window),
        this.metricsRepository.costCenterCycleTime(window),
        this.metricsRepository.bottlenecks(companyId),
        this.metricsRepository.repeatedRequests(window),
      ]);

    return {
      from,
      to,
      totals,
      consumption,
      approvers,
      costCenters,
      bottlenecks,
      repeated,
    };
  }
}
