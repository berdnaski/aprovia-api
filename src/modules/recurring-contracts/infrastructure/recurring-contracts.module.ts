import { Module } from '@nestjs/common';
import { CategoriesModule } from 'src/modules/categories/infrastructure/categories.module';
import { ChartAccountsModule } from 'src/modules/chart-accounts/infrastructure/chart-accounts.module';
import { CompaniesModule } from 'src/modules/companies/infrastructure/companies.module';
import { CostCentersModule } from 'src/modules/cost-centers/infrastructure/cost-centers.module';
import { BudgetsModule } from 'src/modules/budgets/infrastructure/budgets.module';
import { InvoicesModule } from 'src/modules/invoices/infrastructure/invoices.module';
import { MatchingModule } from 'src/modules/matching/infrastructure/matching.module';
import { PurchaseRequestsModule } from 'src/modules/purchase-requests/infrastructure/purchase-requests.module';
import { SuppliersModule } from 'src/modules/suppliers/infrastructure/suppliers.module';
import { CancelRecurringContractUseCase } from '../application/cancel-recurring-contract.use-case';
import { CreateRecurringContractUseCase } from '../application/create-recurring-contract.use-case';
import { FindRecurringContractByIdUseCase } from '../application/find-recurring-contract-by-id.use-case';
import { GenerateRecurringOccurrencesUseCase } from '../application/generate-recurring-occurrences.use-case';
import { LinkInvoiceToRecurringContractUseCase } from '../application/link-invoice-to-recurring-contract.use-case';
import { ListOccurrencesUseCase } from '../application/list-occurrences.use-case';
import { ListRecurringContractsUseCase } from '../application/list-recurring-contracts.use-case';
import { IRecurringContractRepository } from '../domain/recurring-contracts.repository.interface';
import { IRecurringOccurrenceRepository } from '../domain/recurring-occurrences.repository.interface';
import {
  InvoiceRecurringContractController,
  RecurringContractsController,
  RequestRecurringContractController,
} from './recurring-contracts.controller';
import { RecurringContractRepository } from './recurring-contracts.repository';
import { RecurringOccurrenceRepository } from './recurring-occurrences.repository';

@Module({
  imports: [
    PurchaseRequestsModule,
    InvoicesModule,
    MatchingModule,
    CostCentersModule,
    CategoriesModule,
    ChartAccountsModule,
    CompaniesModule,
    BudgetsModule,
    SuppliersModule,
  ],
  controllers: [
    RecurringContractsController,
    RequestRecurringContractController,
    InvoiceRecurringContractController,
  ],
  providers: [
    {
      provide: IRecurringContractRepository,
      useClass: RecurringContractRepository,
    },
    {
      provide: IRecurringOccurrenceRepository,
      useClass: RecurringOccurrenceRepository,
    },
    CreateRecurringContractUseCase,
    FindRecurringContractByIdUseCase,
    ListRecurringContractsUseCase,
    ListOccurrencesUseCase,
    CancelRecurringContractUseCase,
    LinkInvoiceToRecurringContractUseCase,
    GenerateRecurringOccurrencesUseCase,
  ],
  exports: [GenerateRecurringOccurrencesUseCase],
})
export class RecurringContractsModule {}
