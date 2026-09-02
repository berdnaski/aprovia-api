import {
  ApprovalBottleneck,
  DailyVolume,
  ApproverPerformance,
  CostCenterConsumption,
  CostCenterCycleTime,
  MonthlyCostCenterSummary,
  RepeatedRequest,
  StatusTotal,
} from './metrics';

export interface MetricsWindow {
  companyId: string;
  from: Date;
  to: Date;
}

export abstract class IMetricsRepository {
  abstract statusTotals(window: MetricsWindow): Promise<StatusTotal[]>;

  abstract costCenterConsumption(
    companyId: string,
    periodStart: Date,
  ): Promise<CostCenterConsumption[]>;

  abstract approverPerformance(
    window: MetricsWindow,
  ): Promise<ApproverPerformance[]>;

  abstract costCenterCycleTime(
    window: MetricsWindow,
  ): Promise<CostCenterCycleTime[]>;

  abstract bottlenecks(companyId: string): Promise<ApprovalBottleneck[]>;

  abstract repeatedRequests(window: MetricsWindow): Promise<RepeatedRequest[]>;

  abstract dailyVolume(window: MetricsWindow): Promise<DailyVolume[]>;

  abstract monthlySummary(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<MonthlyCostCenterSummary[]>;
}
