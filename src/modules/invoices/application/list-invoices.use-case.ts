import { Injectable } from '@nestjs/common';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { InvoiceEntity } from '../domain/invoice.entity';
import { ListInvoicesQueryDto } from '../dto/list-invoices-query.dto';
import { IInvoiceRepository } from '../domain/invoices.repository.interface';

@Injectable()
export class ListInvoicesUseCase {
  constructor(private readonly invoiceRepository: IInvoiceRepository) {}

  async execute(purchaseOrderId: string): Promise<InvoiceEntity[]> {
    return this.invoiceRepository.listByOrder(purchaseOrderId);
  }

  async executeForCompany(
    companyId: string,
    query: ListInvoicesQueryDto,
  ): Promise<Page<InvoiceEntity>> {
    return this.invoiceRepository.list({
      companyId,
      status: query.status,
      supplierId: query.supplierId,
      unlinkedOnly: query.unlinkedOnly,
      search: query.search,
      skip: query.skip,
      take: query.take,
      page: query.page,
      perPage: query.perPage,
    });
  }
}
