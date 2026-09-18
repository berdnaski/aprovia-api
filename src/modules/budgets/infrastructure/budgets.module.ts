import { Module } from '@nestjs/common';
import { CompaniesModule } from 'src/modules/companies/infrastructure/companies.module';
import { CostCentersModule } from 'src/modules/cost-centers/infrastructure/cost-centers.module';
import { IPayableAllocationRepository } from 'src/modules/matching/domain/payable-allocations.repository.interface';
import { PayableAllocationRepository } from 'src/modules/matching/infrastructure/payable-allocations.repository';
import { AssessBudgetAvailabilityUseCase } from '../application/assess-budget-availability.use-case';
import { CreateBudgetUseCase } from '../application/create-budget.use-case';
import { GetBudgetDocumentDownloadUrlUseCase } from '../application/get-budget-document-download-url.use-case';
import { FindBudgetByIdUseCase } from '../application/find-budget-by-id.use-case';
import { GetBudgetConsumptionUseCase } from '../application/get-budget-consumption.use-case';
import { ListBudgetDocumentsUseCase } from '../application/list-budget-documents.use-case';
import { ListBudgetEntriesUseCase } from '../application/list-budget-entries.use-case';
import { ListCostCenterBudgetsUseCase } from '../application/list-cost-center-budgets.use-case';
import { UpdateBudgetUseCase } from '../application/update-budget.use-case';
import { UploadBudgetDocumentUseCase } from '../application/upload-budget-document.use-case';
import { IBudgetEntryRepository } from '../domain/budget-entries.repository.interface';
import { IBudgetDocumentRepository } from '../domain/budget-documents.repository.interface';
import { IBudgetRepository } from '../domain/budgets.repository.interface';
import { BudgetBalanceService } from '../domain/services/budget-balance.service';
import { BudgetPeriodService } from '../domain/services/budget-period.service';
import { UnderReviewRegistry } from '../domain/under-review.provider';
import { BudgetEntryRepository } from './budget-entries.repository';
import { BudgetDocumentRepository } from './budget-documents.repository';
import { BudgetsController } from './budgets.controller';
import { BudgetRepository } from './budgets.repository';
import { CostCenterBudgetsController } from './cost-center-budgets.controller';

@Module({
  imports: [CostCentersModule, CompaniesModule],
  controllers: [CostCenterBudgetsController, BudgetsController],
  providers: [
    { provide: IBudgetRepository, useClass: BudgetRepository },
    { provide: IBudgetEntryRepository, useClass: BudgetEntryRepository },
    {
      provide: IBudgetDocumentRepository,
      useClass: BudgetDocumentRepository,
    },
    {
      provide: IPayableAllocationRepository,
      useClass: PayableAllocationRepository,
    },
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
    UploadBudgetDocumentUseCase,
    ListBudgetDocumentsUseCase,
    GetBudgetDocumentDownloadUrlUseCase,
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
