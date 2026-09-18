import { Injectable } from '@nestjs/common';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { ServiceInvoiceEntity } from '../domain/service-invoice.entity';
import { IServiceInvoiceRepository } from '../domain/service-invoices.repository.interface';
import { ListServiceInvoicesQueryDto } from '../dto/list-service-invoices-query.dto';

@Injectable()
export class ListServiceInvoicesUseCase {
  constructor(
    private readonly serviceInvoiceRepository: IServiceInvoiceRepository,
  ) {}

  async execute(
    companyId: string,
    query: ListServiceInvoicesQueryDto,
  ): Promise<Page<ServiceInvoiceEntity>> {
    return this.serviceInvoiceRepository.list({
      companyId,
      status: query.status,
      supplierId: query.supplierId,
      search: query.search,
      skip: query.skip,
      take: query.take,
      page: query.page,
      perPage: query.perPage,
    });
  }
}
