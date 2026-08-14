import { Module } from '@nestjs/common';
import { AuditModule } from 'src/modules/audit/infrastructure/audit.module';
import { CompaniesModule } from 'src/modules/companies/infrastructure/companies.module';
import { InvoicesModule } from 'src/modules/invoices/infrastructure/invoices.module';
import { PurchaseOrdersModule } from 'src/modules/purchase-orders/infrastructure/purchase-orders.module';
import { SuppliersModule } from 'src/modules/suppliers/infrastructure/suppliers.module';
import { StorageModule } from 'src/shared/infrastructure/storage/storage.module';
import { FindMatchResultByIdUseCase } from '../application/find-match-result-by-id.use-case';
import { ListMatchResultsUseCase } from '../application/list-match-results.use-case';
import { ListPayablesUseCase } from '../application/list-payables.use-case';
import { MarkPayableAsPaidUseCase } from '../application/mark-payable-as-paid.use-case';
import { OverrideMatchUseCase } from '../application/override-match.use-case';
import { ReleasePayableWithoutInvoiceUseCase } from '../application/release-payable-without-invoice.use-case';
import { RunMatchUseCase } from '../application/run-match.use-case';
import { IMatchResultRepository } from '../domain/matching.repository.interface';
import { IPayableRepository } from '../domain/payables.repository.interface';
import {
  InvoiceMatchController,
  MatchingController,
} from './matching.controller';
import { MatchResultRepository } from './matching.repository';
import { PayablesController } from './payables.controller';
import { PayableRepository } from './payables.repository';

@Module({
  imports: [
    PurchaseOrdersModule,
    InvoicesModule,
    SuppliersModule,
    CompaniesModule,
    AuditModule,
    StorageModule,
  ],
  controllers: [MatchingController, InvoiceMatchController, PayablesController],
  providers: [
    { provide: IMatchResultRepository, useClass: MatchResultRepository },
    { provide: IPayableRepository, useClass: PayableRepository },
    RunMatchUseCase,
    OverrideMatchUseCase,
    FindMatchResultByIdUseCase,
    ListMatchResultsUseCase,
    ListPayablesUseCase,
    MarkPayableAsPaidUseCase,
    ReleasePayableWithoutInvoiceUseCase,
  ],
  exports: [IMatchResultRepository, IPayableRepository],
})
export class MatchingModule {}
