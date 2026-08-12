import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { isFirstBusinessDayOfMonth } from 'src/shared/domain/business-calendar';
import { EscalateStaleStepsUseCase } from '../application/escalate-stale-steps.use-case';
import { ExpireStaleInvitesUseCase } from '../application/expire-stale-invites.use-case';
import { PurgeExpiredTokensUseCase } from '../application/purge-expired-tokens.use-case';
import { RollOverBudgetsUseCase } from '../application/roll-over-budgets.use-case';
import { SendMonthlyReportsUseCase } from '../application/send-monthly-reports.use-case';
import { SendSlaRemindersUseCase } from '../application/send-sla-reminders.use-case';

const TIMEZONE = 'America/Sao_Paulo';

@Injectable()
export class SchedulerJobs {
  private readonly logger = new Logger(SchedulerJobs.name);

  constructor(
    private readonly sendSlaRemindersUseCase: SendSlaRemindersUseCase,
    private readonly escalateStaleStepsUseCase: EscalateStaleStepsUseCase,
    private readonly rollOverBudgetsUseCase: RollOverBudgetsUseCase,
    private readonly purgeExpiredTokensUseCase: PurgeExpiredTokensUseCase,
    private readonly expireStaleInvitesUseCase: ExpireStaleInvitesUseCase,
    private readonly sendMonthlyReportsUseCase: SendMonthlyReportsUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Cron('*/15 * * * *', { name: 'sla-reminders', timeZone: TIMEZONE })
  remindApprovers(): Promise<void> {
    return this.run('lembrete de SLA', () =>
      this.sendSlaRemindersUseCase.execute(),
    );
  }

  @Cron('5-59/15 * * * *', { name: 'sla-escalation', timeZone: TIMEZONE })
  escalateStaleSteps(): Promise<void> {
    return this.run('escalonamento de SLA', () =>
      this.escalateStaleStepsUseCase.execute(),
    );
  }

  @Cron('0 3 1 * *', { name: 'budget-rollover', timeZone: TIMEZONE })
  rollOverBudgets(): Promise<void> {
    return this.run('virada orçamentária', () =>
      this.rollOverBudgetsUseCase.execute(),
    );
  }

  @Cron('0 4 * * *', { name: 'token-purge', timeZone: TIMEZONE })
  purgeExpiredTokens(): Promise<void> {
    return this.run('expurgo de tokens', () =>
      this.purgeExpiredTokensUseCase.execute(),
    );
  }

  @Cron('30 4 * * *', { name: 'invite-expiration', timeZone: TIMEZONE })
  expireStaleInvites(): Promise<void> {
    return this.run('expiração de convites', () =>
      this.expireStaleInvitesUseCase.execute(),
    );
  }

  @Cron('0 7 1-5 * *', { name: 'monthly-report', timeZone: TIMEZONE })
  sendMonthlyReports(): Promise<void> {
    return this.run('relatório mensal', async () => {
      if (!isFirstBusinessDayOfMonth(new Date())) {
        return 0;
      }

      return this.sendMonthlyReportsUseCase.execute();
    });
  }

  private async run(label: string, work: () => Promise<number>): Promise<void> {
    if (
      this.configService.get<string>('SCHEDULER_ENABLED', 'true') === 'false'
    ) {
      return;
    }

    try {
      await work();
    } catch (error) {
      this.logger.error(
        `Job "${label}" falhou e será tentado na próxima janela: ${(error as Error).message}`,
      );
    }
  }
}
