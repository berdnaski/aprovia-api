import { Injectable } from '@nestjs/common';
import { RequestStatus } from 'generated/prisma/enums';
import { PrismaService } from 'src/shared/infrastructure/database/prisma.service';

export interface CostCenterSummary {
  costCenterId: string;
  managerName: string | null;
  memberCount: number;
  openRequests: number;
  budgetId: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  totalAmountCents: bigint | null;
  committedCents: bigint;
  underReviewCents: bigint;
}

const OPEN_STATUSES: RequestStatus[] = [
  RequestStatus.PENDING,
  RequestStatus.CHANGES_REQUESTED,
];

@Injectable()
export class CostCenterSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async summarize(
    companyId: string,
    reference: Date,
  ): Promise<Map<string, CostCenterSummary>> {
    const [centers, memberCounts, openCounts, budgets] = await Promise.all([
      this.prisma.costCenter.findMany({
        where: { company_id: companyId },
        select: {
          id: true,
          manager: { select: { user: { select: { name: true } } } },
        },
      }),
      this.prisma.costCenterMember.groupBy({
        by: ['cost_center_id'],
        where: { cost_center: { company_id: companyId } },
        _count: { _all: true },
      }),
      this.prisma.purchaseRequest.groupBy({
        by: ['cost_center_id'],
        where: { company_id: companyId, status: { in: OPEN_STATUSES } },
        _count: { _all: true },
        _sum: { total_amount_cents: true },
      }),
      this.prisma.budget.findMany({
        where: {
          cost_center: { company_id: companyId },
          period_start: { lte: reference },
          period_end: { gte: reference },
        },
        select: {
          id: true,
          cost_center_id: true,
          period_start: true,
          period_end: true,
          total_amount_cents: true,
          entries: { select: { amount_cents: true } },
        },
      }),
    ]);

    const memberByCenter = new Map(
      memberCounts.map((row) => [row.cost_center_id, row._count._all]),
    );

    const openByCenter = new Map(
      openCounts.map((row) => [
        row.cost_center_id,
        {
          count: row._count._all,
          amount: row._sum.total_amount_cents ?? 0n,
        },
      ]),
    );

    const budgetByCenter = new Map(
      budgets.map((budget) => [
        budget.cost_center_id,
        {
          ...budget,
          committed: budget.entries.reduce(
            (total, entry) => total + entry.amount_cents,
            0n,
          ),
        },
      ]),
    );

    return new Map(
      centers.map((center) => {
        const budget = budgetByCenter.get(center.id);
        const open = openByCenter.get(center.id);

        return [
          center.id,
          {
            costCenterId: center.id,
            managerName: center.manager?.user?.name ?? null,
            memberCount: memberByCenter.get(center.id) ?? 0,
            openRequests: open?.count ?? 0,
            budgetId: budget?.id ?? null,
            periodStart: budget?.period_start ?? null,
            periodEnd: budget?.period_end ?? null,
            totalAmountCents: budget?.total_amount_cents ?? null,
            committedCents: budget?.committed ?? 0n,
            underReviewCents: open?.amount ?? 0n,
          },
        ];
      }),
    );
  }
}
