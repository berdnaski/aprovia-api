import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/infrastructure/auth.module';
import { UsersModule } from './modules/users/infrastructure/users.module';
import { DatabaseModule } from './shared/infrastructure/database/database.module';
import { SecurityModule } from './shared/infrastructure/security/security.module';
import { MailModule } from './shared/mail/mail.module';
import { CompaniesModule } from './modules/companies/infrastructure/companies.module';
import { CostCentersModule } from './modules/cost-centers/infrastructure/cost-centers.module';
import { ApprovalRulesModule } from './modules/approval-rules/infrastructure/approval-rules.module';
import { BudgetsModule } from './modules/budgets/infrastructure/budgets.module';
import { SuppliersModule } from './modules/suppliers/infrastructure/suppliers.module';
import { CategoriesModule } from './modules/categories/infrastructure/categories.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/infrastructure/purchase-orders.module';
import { InvoicesModule } from './modules/invoices/infrastructure/invoices.module';
import { MatchingModule } from './modules/matching/infrastructure/matching.module';
import { ReceiptsModule } from './modules/receipts/infrastructure/receipts.module';
import { PurchaseRequestsModule } from './modules/purchase-requests/infrastructure/purchase-requests.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RequestContextInterceptor } from './shared/infrastructure/http/request-context.interceptor';
import { AuditModule } from './modules/audit/infrastructure/audit.module';
import { NotificationsModule } from './modules/notifications/infrastructure/notifications.module';
import { BillingModule } from './modules/billing/infrastructure/billing.module';
import { validateEnv } from './shared/config/env.schema';
import { StorageModule } from './shared/infrastructure/storage/storage.module';
import { AiModule } from './shared/infrastructure/ai/ai.module';
import { QueueModule } from './shared/infrastructure/queue/queue.module';
import { SchedulerModule } from './modules/scheduler/infrastructure/scheduler.module';
import { InvitesModule } from './modules/invites/infrastructure/invites.module';
import { PlatformModule } from './modules/platform/infrastructure/platform.module';
import { FeedbackModule } from './modules/feedback/infrastructure/feedback.module';
import { MarketingModule } from './modules/marketing/infrastructure/marketing.module';
import { AnalyticsModule } from './modules/analytics/infrastructure/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    BillingModule,
    AuditModule,
    StorageModule,
    AiModule,
    QueueModule,
    SecurityModule,
    MailModule,
    NotificationsModule,
    UsersModule,
    AuthModule,
    CompaniesModule,
    CostCentersModule,
    ApprovalRulesModule,
    BudgetsModule,
    SuppliersModule,
    CategoriesModule,
    PurchaseRequestsModule,
    PurchaseOrdersModule,
    ReceiptsModule,
    InvoicesModule,
    MatchingModule,
    InvitesModule,
    PlatformModule,
    FeedbackModule,
    MarketingModule,
    AnalyticsModule,
    SchedulerModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
  ],
})
export class AppModule {}
