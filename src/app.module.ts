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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    SecurityModule,
    MailModule,
    UsersModule,
    AuthModule,
    CompaniesModule,
    CostCentersModule,
    ApprovalRulesModule,
    BudgetsModule,
  ],
})
export class AppModule {}
