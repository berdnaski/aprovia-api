import { Module } from '@nestjs/common';
import { AuditModule } from 'src/modules/audit/infrastructure/audit.module';
import { CompaniesModule } from 'src/modules/companies/infrastructure/companies.module';
import { MatchingModule } from 'src/modules/matching/infrastructure/matching.module';
import { SuppliersModule } from 'src/modules/suppliers/infrastructure/suppliers.module';
import { ApproveServiceInvoiceUseCase } from '../application/approve-service-invoice.use-case';
import { FindServiceInvoiceByIdUseCase } from '../application/find-service-invoice-by-id.use-case';
import { ListServiceInvoicesUseCase } from '../application/list-service-invoices.use-case';
import { RejectServiceInvoiceUseCase } from '../application/reject-service-invoice.use-case';
import { UploadServiceInvoiceUseCase } from '../application/upload-service-invoice.use-case';
import { INfseParser } from '../domain/nfse-parser.interface';
import { IServiceInvoiceRepository } from '../domain/service-invoices.repository.interface';
import { NfseXmlParser } from './nfse-xml.parser';
import { ServiceInvoicesController } from './service-invoices.controller';
import { ServiceInvoiceRepository } from './service-invoices.repository';

@Module({
  imports: [CompaniesModule, AuditModule, MatchingModule, SuppliersModule],
  controllers: [ServiceInvoicesController],
  providers: [
    {
      provide: IServiceInvoiceRepository,
      useClass: ServiceInvoiceRepository,
    },
    { provide: INfseParser, useClass: NfseXmlParser },
    UploadServiceInvoiceUseCase,
    FindServiceInvoiceByIdUseCase,
    ListServiceInvoicesUseCase,
    RejectServiceInvoiceUseCase,
    ApproveServiceInvoiceUseCase,
  ],
  exports: [IServiceInvoiceRepository, FindServiceInvoiceByIdUseCase],
})
export class ServiceInvoicesModule {}
