import { Injectable } from '@nestjs/common';
import { ChartAccountKind } from 'generated/prisma/enums';
import { EntitlementsService } from 'src/modules/billing/application/entitlements.service';
import { PlanFeature } from 'src/modules/billing/domain/entitlements';
import { BudgetPeriodService } from 'src/modules/budgets/domain/services/budget-period.service';
import { DreReport } from '../domain/metrics';
import { IMetricsRepository } from '../domain/metrics.repository.interface';
import { DreQueryDto } from '../dto/dre-query.dto';

@Injectable()
export class GetDreUseCase {
  constructor(
    private readonly metricsRepository: IMetricsRepository,
    private readonly entitlementsService: EntitlementsService,
    private readonly budgetPeriodService: BudgetPeriodService,
  ) {}

  async execute(companyId: string, query: DreQueryDto): Promise<DreReport> {
    await this.entitlementsService.assertFeature(
      companyId,
      PlanFeature.ADVANCED_REPORTS,
    );

    const now = new Date();
    const currentPeriod = this.budgetPeriodService.current(now);

    const from = query.from ?? currentPeriod.periodStart;
    const to = query.to ?? now;
    const toInclusive = query.to
      ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999)
      : to;

    const lines = await this.metricsRepository.dreLines({
      companyId,
      from,
      to: toInclusive,
    });

    const sumByKind = (kind: ChartAccountKind): bigint =>
      lines
        .filter((line) => line.kind === kind)
        .reduce((sum, line) => sum + line.amountCents, 0n);

    const revenueCents = sumByKind(ChartAccountKind.REVENUE);
    const costCents = sumByKind(ChartAccountKind.COST);
    const expenseCents = sumByKind(ChartAccountKind.EXPENSE);

    return {
      from,
      to,
      revenueCents,
      costCents,
      expenseCents,
      resultCents: revenueCents - costCents - expenseCents,
      lines,
    };
  }
}
