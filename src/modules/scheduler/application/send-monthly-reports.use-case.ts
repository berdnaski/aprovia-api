import { Injectable, Logger } from '@nestjs/common';
import { NotificationEvent } from 'generated/prisma/enums';
import { IMetricsRepository } from 'src/modules/analytics/domain/metrics.repository.interface';
import { BudgetPeriodService } from 'src/modules/budgets/domain/services/budget-period.service';
import {
  DispatchNotificationInput,
  INotificationDispatcher,
  RecipientKind,
} from 'src/modules/notifications/domain/notification.dispatcher';

@Injectable()
export class SendMonthlyReportsUseCase {
  private readonly logger = new Logger(SendMonthlyReportsUseCase.name);

  constructor(
    private readonly metricsRepository: IMetricsRepository,
    private readonly budgetPeriodService: BudgetPeriodService,
    private readonly notificationDispatcher: INotificationDispatcher,
  ) {}

  async execute(reference: Date = new Date()): Promise<number> {
    const currentKey = this.budgetPeriodService.currentMonthKey(reference);
    const current = this.budgetPeriodService.fromMonthKey(currentKey);

    const periodKey = this.budgetPeriodService.currentMonthKey(
      new Date(current.periodStart.getTime() - 1),
    );
    const period = this.budgetPeriodService.fromMonthKey(periodKey);
    const periodEnd = new Date(period.periodEnd.getTime() + 24 * 3600 * 1000);

    const summaries = await this.metricsRepository.monthlySummary(
      period.periodStart,
      periodEnd,
    );

    const notifications: DispatchNotificationInput[] = summaries.map(
      (summary) => ({
        companyId: summary.companyId,
        event: NotificationEvent.MONTHLY_REPORT,
        recipient: {
          kind: RecipientKind.MEMBER,
          memberId: summary.managerId,
        },
        scope: `${summary.costCenterId}:${periodKey}`,
        params: {
          costCenterId: summary.costCenterId,
          costCenterName: summary.costCenterName,
          period: periodKey,
          approvedCount: summary.approvedCount,
          totalCents: summary.totalCents.toString(),
        },
      }),
    );

    await this.notificationDispatcher.dispatchAll(notifications);

    if (notifications.length > 0) {
      this.logger.log(
        `Relatório mensal de ${periodKey} enviado a ${notifications.length} gestor(es) de Centro de Custo`,
      );
    }

    return notifications.length;
  }
}
