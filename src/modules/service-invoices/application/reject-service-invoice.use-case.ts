import { Injectable } from '@nestjs/common';
import { AuditEventType, ServiceInvoiceStatus } from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { ServiceInvoiceEntity } from '../domain/service-invoice.entity';
import { ServiceInvoiceAlreadyResolvedError } from '../domain/service-invoices.errors';
import { IServiceInvoiceRepository } from '../domain/service-invoices.repository.interface';
import { FindServiceInvoiceByIdUseCase } from './find-service-invoice-by-id.use-case';

@Injectable()
export class RejectServiceInvoiceUseCase {
  constructor(
    private readonly serviceInvoiceRepository: IServiceInvoiceRepository,
    private readonly findServiceInvoiceByIdUseCase: FindServiceInvoiceByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    id: string,
    actor: RequestActor,
    reason: string,
  ): Promise<ServiceInvoiceEntity> {
    const serviceInvoice = await this.findServiceInvoiceByIdUseCase.execute(
      id,
      actor.companyId,
    );

    if (serviceInvoice.status !== ServiceInvoiceStatus.RECEIVED) {
      throw new ServiceInvoiceAlreadyResolvedError(serviceInvoice.status);
    }

    const rejected = await this.serviceInvoiceRepository.reject(
      id,
      actor.memberId,
      reason,
    );

    await this.auditLogRepository.record({
      companyId: actor.companyId,
      actorId: actor.userId,
      eventType: AuditEventType.SERVICE_INVOICE_REJECTED,
      entityType: 'service_invoice',
      entityId: serviceInvoice.id,
      newData: { reason },
    });

    return rejected;
  }
}
