import { Injectable } from '@nestjs/common';
import { InvoiceEntity } from '../domain/invoice.entity';
import { InvoiceNotFoundError } from '../domain/invoices.errors';
import { IInvoiceRepository } from '../domain/invoices.repository.interface';

@Injectable()
export class FindInvoiceByIdUseCase {
  constructor(private readonly invoiceRepository: IInvoiceRepository) {}

  async execute(id: string, companyId: string): Promise<InvoiceEntity> {
    const invoice = await this.invoiceRepository.findById(id, companyId);

    if (!invoice) {
      throw new InvoiceNotFoundError();
    }

    return invoice;
  }
}
