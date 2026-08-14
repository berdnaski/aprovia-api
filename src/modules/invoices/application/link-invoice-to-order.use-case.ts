import { Injectable } from '@nestjs/common';
import { AuditEventType, InvoiceStatus } from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { FindPurchaseOrderByIdUseCase } from 'src/modules/purchase-orders/application/find-purchase-order-by-id.use-case';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { InvoiceEntity } from '../domain/invoice.entity';
import { InvoiceAlreadyResolvedError } from '../domain/invoices.errors';
import { IInvoiceRepository } from '../domain/invoices.repository.interface';
import { FindInvoiceByIdUseCase } from './find-invoice-by-id.use-case';

@Injectable()
export class LinkInvoiceToOrderUseCase {
  constructor(
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly findInvoiceByIdUseCase: FindInvoiceByIdUseCase,
    private readonly findPurchaseOrderByIdUseCase: FindPurchaseOrderByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    invoiceId: string,
    purchaseOrderId: string,
    actor: RequestActor,
  ): Promise<InvoiceEntity> {
    const invoice = await this.findInvoiceByIdUseCase.execute(
      invoiceId,
      actor.companyId,
    );

    if (invoice.status !== InvoiceStatus.RECEIVED) {
      throw new InvoiceAlreadyResolvedError(invoice.status);
    }

    const order = await this.findPurchaseOrderByIdUseCase.execute(
      purchaseOrderId,
      actor.companyId,
    );

    const linked = await this.invoiceRepository.linkToOrder(
      invoiceId,
      purchaseOrderId,
      order.supplierId,
    );

    await this.auditLogRepository.record({
      companyId: actor.companyId,
      actorId: actor.userId,
      eventType: AuditEventType.INVOICE_UPLOADED,
      entityType: 'invoice',
      entityId: invoice.id,
      newData: { purchaseOrderNumber: order.number },
    });

    return linked;
  }
}
