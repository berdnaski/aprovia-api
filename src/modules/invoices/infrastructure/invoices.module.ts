import { Module } from '@nestjs/common';
import { AuditModule } from 'src/modules/audit/infrastructure/audit.module';
import { CompaniesModule } from 'src/modules/companies/infrastructure/companies.module';
import { PurchaseOrdersModule } from 'src/modules/purchase-orders/infrastructure/purchase-orders.module';
import { FindInvoiceByIdUseCase } from '../application/find-invoice-by-id.use-case';
import { LinkInvoiceToOrderUseCase } from '../application/link-invoice-to-order.use-case';
import { ListInvoicesUseCase } from '../application/list-invoices.use-case';
import { RejectInvoiceUseCase } from '../application/reject-invoice.use-case';
import { UploadInvoiceUseCase } from '../application/upload-invoice.use-case';
import { IInvoiceRepository } from '../domain/invoices.repository.interface';
import { INfeParser } from '../domain/nfe-parser.interface';
import {
  InvoicesController,
  OrderInvoicesController,
} from './invoices.controller';
import { InvoiceRepository } from './invoices.repository';
import { NfeXmlParser } from './nfe-xml.parser';

@Module({
  imports: [PurchaseOrdersModule, CompaniesModule, AuditModule],
  controllers: [InvoicesController, OrderInvoicesController],
  providers: [
    { provide: IInvoiceRepository, useClass: InvoiceRepository },
    { provide: INfeParser, useClass: NfeXmlParser },
    UploadInvoiceUseCase,
    FindInvoiceByIdUseCase,
    ListInvoicesUseCase,
    LinkInvoiceToOrderUseCase,
    RejectInvoiceUseCase,
  ],
  exports: [IInvoiceRepository, FindInvoiceByIdUseCase],
})
export class InvoicesModule {}
