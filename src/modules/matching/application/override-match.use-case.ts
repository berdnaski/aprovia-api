import { Injectable } from '@nestjs/common';
import {
  AuditEventType,
  InvoiceStatus,
  MatchStatus,
  PayableReleaseReason,
  PayableStatus,
} from 'generated/prisma/enums';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { IInvoiceRepository } from 'src/modules/invoices/domain/invoices.repository.interface';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { MatchResultEntity } from '../domain/match-result.entity';
import {
  MatchAlreadyResolvedError,
  MatchNotDivergentError,
  MatchResultNotFoundError,
  OverrideJustificationRequiredError,
} from '../domain/matching.errors';
import { IMatchResultRepository } from '../domain/matching.repository.interface';
import { IPayableRepository } from '../domain/payables.repository.interface';

const MIN_NOTE_LENGTH = 10;

@Injectable()
export class OverrideMatchUseCase {
  constructor(
    private readonly matchResultRepository: IMatchResultRepository,
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly payableRepository: IPayableRepository,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    matchResultId: string,
    actor: RequestActor,
    note: string,
  ): Promise<MatchResultEntity> {
    const match = await this.matchResultRepository.findById(
      matchResultId,
      actor.companyId,
    );

    if (!match) {
      throw new MatchResultNotFoundError();
    }

    if (match.status !== MatchStatus.DIVERGENT) {
      if (match.resolvedAt) {
        throw new MatchAlreadyResolvedError();
      }
      throw new MatchNotDivergentError();
    }

    if (note.trim().length < MIN_NOTE_LENGTH) {
      throw new OverrideJustificationRequiredError();
    }

    const resolved = await this.matchResultRepository.resolve(
      matchResultId,
      actor.memberId,
      MatchStatus.OVERRIDDEN,
      note,
    );

    const invoice = await this.invoiceRepository.updateStatus(
      match.invoiceId,
      InvoiceStatus.APPROVED,
    );

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    await this.payableRepository.create({
      companyId: actor.companyId,
      invoiceId: invoice.id,
      supplierId: invoice.supplierId as string,
      amountCents: invoice.totalAmountCents,
      dueDate,
      status: PayableStatus.RELEASED,
      releaseReason: PayableReleaseReason.MATCHED,
      releasedById: actor.memberId,
      releaseNote: note,
    });

    await this.auditLogRepository.record({
      companyId: actor.companyId,
      actorId: actor.userId,
      eventType: AuditEventType.MATCH_OVERRIDDEN,
      entityType: 'match_result',
      entityId: resolved.id,
      newData: { note },
    });

    return resolved;
  }
}
