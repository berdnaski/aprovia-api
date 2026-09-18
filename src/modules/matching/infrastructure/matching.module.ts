import { Module } from '@nestjs/common';
import { AuditModule } from 'src/modules/audit/infrastructure/audit.module';
import { CompaniesModule } from 'src/modules/companies/infrastructure/companies.module';
import { InvoicesModule } from 'src/modules/invoices/infrastructure/invoices.module';
import { PurchaseOrdersModule } from 'src/modules/purchase-orders/infrastructure/purchase-orders.module';
import { ChartAccountsModule } from 'src/modules/chart-accounts/infrastructure/chart-accounts.module';
import { CostCentersModule } from 'src/modules/cost-centers/infrastructure/cost-centers.module';
import { PurchaseRequestsModule } from 'src/modules/purchase-requests/infrastructure/purchase-requests.module';
import { SuppliersModule } from 'src/modules/suppliers/infrastructure/suppliers.module';
import { StorageModule } from 'src/shared/infrastructure/storage/storage.module';
import { DerivePayableAllocationsUseCase } from '../application/derive-payable-allocations.use-case';
import { ExportPayablesUseCase } from '../application/export-payables.use-case';
import { FindMatchResultByIdUseCase } from '../application/find-match-result-by-id.use-case';
import { ListMatchResultsUseCase } from '../application/list-match-results.use-case';
import { ListPayablesUseCase } from '../application/list-payables.use-case';
import { ManagePayableAllocationsUseCase } from '../application/manage-payable-allocations.use-case';
import { MarkPayableAsPaidUseCase } from '../application/mark-payable-as-paid.use-case';
import { OverrideMatchUseCase } from '../application/override-match.use-case';
import { ReleasePayableUseCase } from '../application/release-payable.use-case';
import { ReleasePayableWithoutInvoiceUseCase } from '../application/release-payable-without-invoice.use-case';
import { RunMatchUseCase } from '../application/run-match.use-case';
import { IMatchResultRepository } from '../domain/matching.repository.interface';
import { IPayableAllocationRepository } from '../domain/payable-allocations.repository.interface';
import { IPayableExportRepository } from '../domain/payable-export.repository.interface';
import { IPayableRepository } from '../domain/payables.repository.interface';
import {
  InvoiceMatchController,
  MatchingController,
} from './matching.controller';
import { MatchResultRepository } from './matching.repository';
import { PayableAllocationsController } from './payable-allocations.controller';
import { PayablesController } from './payables.controller';
import { PayableAllocationRepository } from './payable-allocations.repository';
import { PayableExportRepository } from './payable-export.repository';
import { PayableRepository } from './payables.repository';

@Module({
  imports: [
    PurchaseOrdersModule,
    PurchaseRequestsModule,
    ChartAccountsModule,
    CostCentersModule,
    InvoicesModule,
    SuppliersModule,
    CompaniesModule,
    AuditModule,
    StorageModule,
  ],
  controllers: [
    MatchingController,
    InvoiceMatchController,
    PayablesController,
    PayableAllocationsController,
  ],
  providers: [
    { provide: IMatchResultRepository, useClass: MatchResultRepository },
    { provide: IPayableRepository, useClass: PayableRepository },
    {
      provide: IPayableAllocationRepository,
      useClass: PayableAllocationRepository,
    },
    {
      provide: IPayableExportRepository,
      useClass: PayableExportRepository,
    },
    RunMatchUseCase,
    OverrideMatchUseCase,
    FindMatchResultByIdUseCase,
    ListMatchResultsUseCase,
    ListPayablesUseCase,
    MarkPayableAsPaidUseCase,
    ReleasePayableUseCase,
    ReleasePayableWithoutInvoiceUseCase,
    DerivePayableAllocationsUseCase,
    ManagePayableAllocationsUseCase,
    ExportPayablesUseCase,
  ],
  exports: [
    IMatchResultRepository,
    IPayableRepository,
    IPayableAllocationRepository,
  ],
})
export class MatchingModule {}
