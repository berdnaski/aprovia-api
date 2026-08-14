import { Injectable } from '@nestjs/common';
import { InvoiceEntity } from '../domain/invoice.entity';
import { IInvoiceRepository } from '../domain/invoices.repository.interface';

@Injectable()
export class ListInvoicesUseCase {
  constructor(private readonly invoiceRepository: IInvoiceRepository) {}

  async execute(purchaseOrderId: string): Promise<InvoiceEntity[]> {
    return this.invoiceRepository.listByOrder(purchaseOrderId);
  }
}
