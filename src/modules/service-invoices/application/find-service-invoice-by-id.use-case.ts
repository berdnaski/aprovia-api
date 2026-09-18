import { Injectable } from '@nestjs/common';
import { ServiceInvoiceEntity } from '../domain/service-invoice.entity';
import { ServiceInvoiceNotFoundError } from '../domain/service-invoices.errors';
import { IServiceInvoiceRepository } from '../domain/service-invoices.repository.interface';

@Injectable()
export class FindServiceInvoiceByIdUseCase {
  constructor(
    private readonly serviceInvoiceRepository: IServiceInvoiceRepository,
  ) {}

  async execute(id: string, companyId: string): Promise<ServiceInvoiceEntity> {
    const serviceInvoice = await this.serviceInvoiceRepository.findById(
      id,
      companyId,
    );

    if (!serviceInvoice) {
      throw new ServiceInvoiceNotFoundError();
    }

    return serviceInvoice;
  }
}
