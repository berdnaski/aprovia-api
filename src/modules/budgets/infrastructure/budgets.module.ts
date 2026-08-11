import { Module } from '@nestjs/common';
import { CompaniesModule } from 'src/modules/companies/infrastructure/companies.module';
import { CostCentersModule } from 'src/modules/cost-centers/infrastructure/cost-centers.module';
import { AssessBudgetAvailabilityUseCase } from '../application/assess-budget-availability.use-case';
import { CreateBudgetUseCase } from '../application/create-budget.use-case';
import { FindBudgetByIdUseCase } from '../application/find-budget-by-id.use-case';
import { GetBudgetConsumptionUseCase } from '../application/get-budget-consumption.use-case';
import { ListBudgetEntriesUseCase } from '../application/list-budget-entries.use-case';
import { ListCostCenterBudgetsUseCase } from '../application/list-cost-center-budgets.use-case';
import { UpdateBudgetUseCase } from '../application/update-budget.use-case';
import { IBudgetEntryRepository } from '../domain/budget-entries.repository.interface';
import { IBudgetRepository } from '../domain/budgets.repository.interface';
import { BudgetBalanceService } from '../domain/services/budget-balance.service';
import { BudgetPeriodService } from '../domain/services/budget-period.service';
import { UnderReviewRegistry } from '../domain/under-review.provider';
import { BudgetEntryRepository } from './budget-entries.repository';
import { BudgetsController } from './budgets.controller';
import { BudgetRepository } from './budgets.repository';
import { CostCenterBudgetsController } from './cost-center-budgets.controller';

@Module({
  imports: [CostCentersModule, CompaniesModule],
  controllers: [CostCenterBudgetsController, BudgetsController],
  providers: [
    { provide: IBudgetRepository, useClass: BudgetRepository },
    { provide: IBudgetEntryRepository, useClass: BudgetEntryRepository },
    BudgetPeriodService,
    BudgetBalanceService,
    UnderReviewRegistry,
    CreateBudgetUseCase,
    FindBudgetByIdUseCase,
    UpdateBudgetUseCase,
    ListCostCenterBudgetsUseCase,
    GetBudgetConsumptionUseCase,
    ListBudgetEntriesUseCase,
    AssessBudgetAvailabilityUseCase,
  ],
  exports: [
    IBudgetRepository,
    IBudgetEntryRepository,
    BudgetPeriodService,
    BudgetBalanceService,
    UnderReviewRegistry,
    GetBudgetConsumptionUseCase,
    AssessBudgetAvailabilityUseCase,
  ],
})
export class BudgetsModule {}
