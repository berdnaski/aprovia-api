import { Injectable } from '@nestjs/common';
import { AuditEventType, InvoiceStatus } from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { InvoiceEntity } from '../domain/invoice.entity';
import { InvoiceAlreadyResolvedError } from '../domain/invoices.errors';
import { IInvoiceRepository } from '../domain/invoices.repository.interface';
import { FindInvoiceByIdUseCase } from './find-invoice-by-id.use-case';

@Injectable()
export class RejectInvoiceUseCase {
  constructor(
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly findInvoiceByIdUseCase: FindInvoiceByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    id: string,
    actor: RequestActor,
    reason: string,
  ): Promise<InvoiceEntity> {
    const invoice = await this.findInvoiceByIdUseCase.execute(
      id,
      actor.companyId,
    );

    if (
      invoice.status === InvoiceStatus.REJECTED ||
      invoice.status === InvoiceStatus.APPROVED
    ) {
      throw new InvoiceAlreadyResolvedError(invoice.status);
    }

    const rejected = await this.invoiceRepository.reject(
      id,
      actor.memberId,
      reason,
    );

    await this.auditLogRepository.record({
      companyId: actor.companyId,
      actorId: actor.userId,
      eventType: AuditEventType.INVOICE_REJECTED,
      entityType: 'invoice',
      entityId: invoice.id,
      newData: { reason },
    });

    return rejected;
  }
}
