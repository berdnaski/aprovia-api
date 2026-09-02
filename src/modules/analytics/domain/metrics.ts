import { RequestStatus } from 'generated/prisma/enums';

export interface StatusTotal {
  status: RequestStatus;
  total: number;
  amountCents: bigint;
}

export interface CostCenterConsumption {
  costCenterId: string;
  costCenterName: string;
  budgetCents: bigint;
  committedCents: bigint;
  availableCents: bigint;
  usagePercent: number;
}

export interface ApproverPerformance {
  memberId: string;
  approverName: string;
  decisions: number;
  averageHours: number;
}

export interface CostCenterCycleTime {
  costCenterId: string;
  costCenterName: string;
  finalized: number;
  averageHours: number;
}

export interface ApprovalBottleneck {
  memberId: string;
  approverName: string;
  waiting: number;
  oldestSince: Date | null;
  amountCents: bigint;
}

export interface RepeatedRequest {
  requesterName: string;
  supplierName: string;
  amountCents: bigint;
  occurrences: number;
  lastAt: Date;
}

export interface DashboardMetrics {
  from: Date;
  to: Date;
  totals: StatusTotal[];
  consumption: CostCenterConsumption[];
  approvers: ApproverPerformance[];
  costCenters: CostCenterCycleTime[];
  bottlenecks: ApprovalBottleneck[];
  repeated: RepeatedRequest[];
  daily: DailyVolume[];
}

export interface MonthlyCostCenterSummary {
  companyId: string;
  costCenterId: string;
  costCenterName: string;
  managerId: string;
  approvedCount: number;
  totalCents: bigint;
}

const SECONDS_IN_HOUR = 3600;

export function toHours(seconds: number | null): number {
  if (seconds === null || !Number.isFinite(seconds)) {
    return 0;
  }

  return Math.round((seconds / SECONDS_IN_HOUR) * 10) / 10;
}

export function usagePercent(budget: bigint, committed: bigint): number {
  if (budget <= 0n) {
    return 0;
  }

  return Number((committed * 10000n) / budget) / 100;
}

export interface DailyVolume {
  day: Date;
  created: number;
  finalized: number;
  approvedCents: bigint;
}
