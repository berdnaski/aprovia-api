import { Injectable } from '@nestjs/common';
import {
  AuditEventType,
  CompanyMemberRole,
  PayableReleaseReason,
  ServiceInvoiceStatus,
} from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { IPayableAllocationRepository } from 'src/modules/matching/domain/payable-allocations.repository.interface';
import { IPayableRepository } from 'src/modules/matching/domain/payables.repository.interface';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { allocate } from 'src/modules/purchase-requests/domain/services/allocation-split';
import { FindSupplierByIdUseCase } from 'src/modules/suppliers/application/find-supplier-by-id.use-case';
import { ForbiddenError, ValidationError } from 'src/shared/domain/errors/domain.error';
import { ServiceInvoiceEntity } from '../domain/service-invoice.entity';
import {
  ServiceInvoiceAlreadyResolvedError,
} from '../domain/service-invoices.errors';
import { assertValidPayableAllocation } from 'src/modules/matching/domain/services/payable-allocation-rules';
import { IServiceInvoiceRepository } from '../domain/service-invoices.repository.interface';
import { ApproveServiceInvoiceDto } from '../dto/approve-service-invoice.dto';
import { FindServiceInvoiceByIdUseCase } from './find-service-invoice-by-id.use-case';

@Injectable()
export class ApproveServiceInvoiceUseCase {
  constructor(
    private readonly serviceInvoiceRepository: IServiceInvoiceRepository,
    private readonly findServiceInvoiceByIdUseCase: FindServiceInvoiceByIdUseCase,
    private readonly payableRepository: IPayableRepository,
    private readonly payableAllocationRepository: IPayableAllocationRepository,
    private readonly findSupplierByIdUseCase: FindSupplierByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    id: string,
    actor: RequestActor,
    dto: ApproveServiceInvoiceDto,
  ): Promise<ServiceInvoiceEntity> {
    if (actor.role !== CompanyMemberRole.FINANCE_ADMIN) {
      throw new ForbiddenError(
        'Só o Admin Financeiro aprova uma nota de serviço e gera a conta a pagar.',
      );
    }

    const serviceInvoice = await this.findServiceInvoiceByIdUseCase.execute(
      id,
      actor.companyId,
    );

    if (serviceInvoice.status !== ServiceInvoiceStatus.RECEIVED) {
      throw new ServiceInvoiceAlreadyResolvedError(serviceInvoice.status);
    }

    const supplierId = dto.supplierId ?? serviceInvoice.supplierId;

    if (!supplierId) {
      throw new ValidationError(
        'Informe o fornecedor para gerar a conta a pagar desta nota de serviço.',
      );
    }

    await this.findSupplierByIdUseCase.execute(supplierId, actor.companyId);

    const payable = await this.payableRepository.create({
      companyId: actor.companyId,
      invoiceId: null,
      supplierId,
      amountCents: serviceInvoice.netAmountCents,
      dueDate: new Date(dto.dueDate),
    });

    await this.payableRepository.release(payable.id, {
      releaseReason: PayableReleaseReason.SERVICE_INVOICE_MATCHED,
      releasedById: actor.memberId,
      proofStorageKey: null,
      releaseNote: `Gerada a partir da NFS-e ${serviceInvoice.number} (líquido após retenções).`,
    });

    if (dto.allocations?.length) {
      const shares = dto.allocations.map((line) => ({
        costCenterId: line.costCenterId,
        chartAccountId: line.chartAccountId ?? null,
        shareBps: line.shareBps,
      }));

      assertValidPayableAllocation(shares);

      const lines = allocate(payable.amountCents, shares);

      await this.payableAllocationRepository.replace(
        payable.id,
        lines.map((line) => ({
          costCenterId: line.costCenterId,
          chartAccountId: line.chartAccountId,
          amountCents: line.amountCents,
        })),
      );
    }

    const approved = await this.serviceInvoiceRepository.approve(
      id,
      payable.id,
    );

    await this.auditLogRepository.record({
      companyId: actor.companyId,
      actorId: actor.userId,
      eventType: AuditEventType.SERVICE_INVOICE_APPROVED,
      entityType: 'service_invoice',
      entityId: serviceInvoice.id,
      newData: {
        payableId: payable.id,
        netAmountCents: serviceInvoice.netAmountCents.toString(),
      },
    });

    return approved;
  }
}
