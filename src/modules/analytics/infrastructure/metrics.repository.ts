import { Injectable } from '@nestjs/common';
import { RequestStatus } from 'generated/prisma/enums';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';
import {
  ApprovalBottleneck,
  ApproverPerformance,
  CostCenterConsumption,
  CostCenterCycleTime,
  MonthlyCostCenterSummary,
  RepeatedRequest,
  StatusTotal,
  toHours,
  usagePercent,
} from '../domain/metrics';
import {
  IMetricsRepository,
  MetricsWindow,
} from '../domain/metrics.repository.interface';

interface StatusRow {
  status: RequestStatus;
  total: number;
  amount_cents: bigint;
}

interface ConsumptionRow {
  cost_center_id: string;
  cost_center_name: string;
  budget_cents: bigint;
  committed_cents: bigint;
}

interface ApproverRow {
  member_id: string;
  approver_name: string;
  decisions: number;
  avg_seconds: number | null;
}

interface CycleRow {
  cost_center_id: string;
  cost_center_name: string;
  finalized: number;
  avg_seconds: number | null;
}

interface BottleneckRow {
  member_id: string;
  approver_name: string;
  waiting: number;
  oldest_since: Date | null;
  amount_cents: bigint;
}

interface RepeatedRow {
  requester_name: string;
  supplier_name: string;
  amount_cents: bigint;
  occurrences: number;
  last_at: Date;
}

interface MonthlyRow {
  company_id: string;
  cost_center_id: string;
  cost_center_name: string;
  manager_id: string;
  approved_count: number;
  total_cents: bigint;
}

@Injectable()
export class MetricsRepository implements IMetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async statusTotals(window: MetricsWindow): Promise<StatusTotal[]> {
    const rows = await this.prisma.$queryRaw<StatusRow[]>`
      SELECT status,
             COUNT(*)::int AS total,
             COALESCE(SUM(total_amount_cents), 0)::bigint AS amount_cents
      FROM purchase_requests
      WHERE company_id = ${window.companyId}
        AND created_at >= ${window.from}
        AND created_at < ${window.to}
      GROUP BY status
    `;

    return rows.map((row) => ({
      status: row.status,
      total: row.total,
      amountCents: row.amount_cents,
    }));
  }

  async costCenterConsumption(
    companyId: string,
    periodStart: Date,
  ): Promise<CostCenterConsumption[]> {
    const rows = await this.prisma.$queryRaw<ConsumptionRow[]>`
      SELECT cc.id AS cost_center_id,
             cc.name AS cost_center_name,
             COALESCE(MAX(b.total_amount_cents), 0)::bigint AS budget_cents,
             COALESCE(SUM(be.amount_cents), 0)::bigint AS committed_cents
      FROM cost_centers cc
      LEFT JOIN budgets b
        ON b.cost_center_id = cc.id AND b.period_start = ${periodStart}
      LEFT JOIN budget_entries be ON be.budget_id = b.id
      WHERE cc.company_id = ${companyId} AND cc.disabled_at IS NULL
      GROUP BY cc.id, cc.name
      ORDER BY cc.name
    `;

    return rows.map((row) => ({
      costCenterId: row.cost_center_id,
      costCenterName: row.cost_center_name,
      budgetCents: row.budget_cents,
      committedCents: row.committed_cents,
      availableCents: row.budget_cents - row.committed_cents,
      usagePercent: usagePercent(row.budget_cents, row.committed_cents),
    }));
  }

  async approverPerformance(
    window: MetricsWindow,
  ): Promise<ApproverPerformance[]> {
    const rows = await this.prisma.$queryRaw<ApproverRow[]>`
      SELECT m.id AS member_id,
             u.name AS approver_name,
             COUNT(d.id)::int AS decisions,
             AVG(EXTRACT(EPOCH FROM (d.decided_at - s.started_at)))::float AS avg_seconds
      FROM decisions d
      JOIN approval_steps s ON s.id = d.approval_step_id
      JOIN purchase_requests r ON r.id = s.purchase_request_id
      JOIN company_members m ON m.id = d.decider_id
      JOIN users u ON u.id = m.user_id
      WHERE r.company_id = ${window.companyId}
        AND s.started_at IS NOT NULL
        AND d.decided_at >= ${window.from}
        AND d.decided_at < ${window.to}
      GROUP BY m.id, u.name
      ORDER BY avg_seconds DESC NULLS LAST
    `;

    return rows.map((row) => ({
      memberId: row.member_id,
      approverName: row.approver_name,
      decisions: row.decisions,
      averageHours: toHours(row.avg_seconds),
    }));
  }

  async costCenterCycleTime(
    window: MetricsWindow,
  ): Promise<CostCenterCycleTime[]> {
    const rows = await this.prisma.$queryRaw<CycleRow[]>`
      SELECT cc.id AS cost_center_id,
             cc.name AS cost_center_name,
             COUNT(r.id)::int AS finalized,
             AVG(EXTRACT(EPOCH FROM (r.finalized_at - r.submitted_at)))::float AS avg_seconds
      FROM purchase_requests r
      JOIN cost_centers cc ON cc.id = r.cost_center_id
      WHERE r.company_id = ${window.companyId}
        AND r.submitted_at IS NOT NULL
        AND r.finalized_at IS NOT NULL
        AND r.finalized_at >= ${window.from}
        AND r.finalized_at < ${window.to}
      GROUP BY cc.id, cc.name
      ORDER BY avg_seconds DESC NULLS LAST
    `;

    return rows.map((row) => ({
      costCenterId: row.cost_center_id,
      costCenterName: row.cost_center_name,
      finalized: row.finalized,
      averageHours: toHours(row.avg_seconds),
    }));
  }

  async bottlenecks(companyId: string): Promise<ApprovalBottleneck[]> {
    const rows = await this.prisma.$queryRaw<BottleneckRow[]>`
      SELECT m.id AS member_id,
             u.name AS approver_name,
             COUNT(s.id)::int AS waiting,
             MIN(s.started_at) AS oldest_since,
             COALESCE(SUM(r.total_amount_cents), 0)::bigint AS amount_cents
      FROM approval_steps s
      JOIN purchase_requests r ON r.id = s.purchase_request_id
      JOIN company_members m ON m.id = s.expected_approver_id
      JOIN users u ON u.id = m.user_id
      WHERE r.company_id = ${companyId}
        AND s.status = 'WAITING'
        AND r.status = 'PENDING'
      GROUP BY m.id, u.name
      ORDER BY waiting DESC
    `;

    return rows.map((row) => ({
      memberId: row.member_id,
      approverName: row.approver_name,
      waiting: row.waiting,
      oldestSince: row.oldest_since,
      amountCents: row.amount_cents,
    }));
  }

  async repeatedRequests(window: MetricsWindow): Promise<RepeatedRequest[]> {
    const rows = await this.prisma.$queryRaw<RepeatedRow[]>`
      SELECT u.name AS requester_name,
             sup.legal_name AS supplier_name,
             r.total_amount_cents AS amount_cents,
             COUNT(*)::int AS occurrences,
             MAX(r.created_at) AS last_at
      FROM purchase_requests r
      JOIN company_members m ON m.id = r.requester_id
      JOIN users u ON u.id = m.user_id
      JOIN suppliers sup ON sup.id = r.supplier_id
      WHERE r.company_id = ${window.companyId}
        AND r.created_at >= ${window.from}
        AND r.created_at < ${window.to}
      GROUP BY u.name, sup.legal_name, r.total_amount_cents
      HAVING COUNT(*) > 1
      ORDER BY occurrences DESC, amount_cents DESC
      LIMIT 20
    `;

    return rows.map((row) => ({
      requesterName: row.requester_name,
      supplierName: row.supplier_name,
      amountCents: row.amount_cents,
      occurrences: row.occurrences,
      lastAt: row.last_at,
    }));
  }

  async monthlySummary(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<MonthlyCostCenterSummary[]> {
    const rows = await this.prisma.$queryRaw<MonthlyRow[]>`
      SELECT cc.company_id,
             cc.id AS cost_center_id,
             cc.name AS cost_center_name,
             cc.manager_id,
             COUNT(r.id)::int AS approved_count,
             COALESCE(SUM(r.total_amount_cents), 0)::bigint AS total_cents
      FROM cost_centers cc
      LEFT JOIN purchase_requests r
        ON r.cost_center_id = cc.id
       AND r.status = 'APPROVED'
       AND r.finalized_at >= ${periodStart}
       AND r.finalized_at < ${periodEnd}
      WHERE cc.disabled_at IS NULL
      GROUP BY cc.company_id, cc.id, cc.name, cc.manager_id
    `;

    return rows.map((row) => ({
      companyId: row.company_id,
      costCenterId: row.cost_center_id,
      costCenterName: row.cost_center_name,
      managerId: row.manager_id,
      approvedCount: row.approved_count,
      totalCents: row.total_cents,
    }));
  }
}
