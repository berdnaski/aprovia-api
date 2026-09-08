import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from 'src/modules/auth/infrastructure/auth.module';
import { BudgetsModule } from 'src/modules/budgets/infrastructure/budgets.module';
import { CompaniesModule } from 'src/modules/companies/infrastructure/companies.module';
import { PurchaseRequestsModule } from 'src/modules/purchase-requests/infrastructure/purchase-requests.module';
import { AnalyticsModule } from 'src/modules/analytics/infrastructure/analytics.module';
import { InvitesModule } from 'src/modules/invites/infrastructure/invites.module';
import { SuppliersModule } from 'src/modules/suppliers/infrastructure/suppliers.module';
import { EscalateStaleStepsUseCase } from '../application/escalate-stale-steps.use-case';
import { ExpireStaleInvitesUseCase } from '../application/expire-stale-invites.use-case';
import { PurgeExpiredTokensUseCase } from '../application/purge-expired-tokens.use-case';
import { RevalidateSuppliersUseCase } from '../application/revalidate-suppliers.use-case';
import { RollOverBudgetsUseCase } from '../application/roll-over-budgets.use-case';
import { SendMonthlyReportsUseCase } from '../application/send-monthly-reports.use-case';
import { SendSlaRemindersUseCase } from '../application/send-sla-reminders.use-case';
import { SchedulerJobs } from './scheduler.jobs';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PurchaseRequestsModule,
    CompaniesModule,
    BudgetsModule,
    AuthModule,
    InvitesModule,
    AnalyticsModule,
    SuppliersModule,
  ],
  providers: [
    SendSlaRemindersUseCase,
    EscalateStaleStepsUseCase,
    RollOverBudgetsUseCase,
    PurgeExpiredTokensUseCase,
    ExpireStaleInvitesUseCase,
    SendMonthlyReportsUseCase,
    RevalidateSuppliersUseCase,
    SchedulerJobs,
  ],
  exports: [
    SendSlaRemindersUseCase,
    EscalateStaleStepsUseCase,
    RollOverBudgetsUseCase,
    ExpireStaleInvitesUseCase,
    SendMonthlyReportsUseCase,
    RevalidateSuppliersUseCase,
  ],
})
export class SchedulerModule {}
