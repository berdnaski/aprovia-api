import { Injectable } from '@nestjs/common';
import {
  AuditEventType,
  InvoiceStatus,
  PayableReleaseReason,
  PayableStatus,
} from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { FindInvoiceByIdUseCase } from 'src/modules/invoices/application/find-invoice-by-id.use-case';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import {
  PayableConferralPendingError,
  PayableNotBlockedError,
  PayableNotFoundError,
} from '../domain/matching.errors';
import { PayableEntity } from '../domain/payable.entity';
import { IPayableRepository } from '../domain/payables.repository.interface';

const CONFERRED: InvoiceStatus[] = [
  InvoiceStatus.MATCHED,
  InvoiceStatus.APPROVED,
];

@Injectable()
export class ReleasePayableUseCase {
  constructor(
    private readonly payableRepository: IPayableRepository,
    private readonly findInvoiceByIdUseCase: FindInvoiceByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    id: string,
    actor: RequestActor,
    note?: string,
  ): Promise<PayableEntity> {
    const payable = await this.payableRepository.findById(id, actor.companyId);

    if (!payable) {
      throw new PayableNotFoundError();
    }

    if (payable.status !== PayableStatus.BLOCKED) {
      throw new PayableNotBlockedError(payable.status);
    }

    if (!payable.invoiceId) {
      throw new PayableConferralPendingError();
    }

    const invoice = await this.findInvoiceByIdUseCase.execute(
      payable.invoiceId,
      actor.companyId,
    );

    if (!CONFERRED.includes(invoice.status)) {
      throw new PayableConferralPendingError();
    }

    const releaseNote = note?.trim() ? note.trim() : null;

    const released = await this.payableRepository.release(id, {
      releaseReason: PayableReleaseReason.MATCHED,
      releasedById: actor.memberId,
      proofStorageKey: null,
      releaseNote,
    });

    await this.auditLogRepository.record({
      companyId: actor.companyId,
      actorId: actor.userId,
      eventType: AuditEventType.PAYABLE_RELEASED,
      entityType: 'payable',
      entityId: payable.id,
      newData: {
        reason: PayableReleaseReason.MATCHED,
        amountCents: payable.amountCents.toString(),
        invoiceNumber: invoice.number,
        note: releaseNote,
      },
    });

    return released;
  }
}
