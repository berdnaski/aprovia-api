import { Injectable } from '@nestjs/common';
import {
  AuditEventType,
  InvoiceStatus,
  PayableReleaseReason,
  PayableStatus,
} from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { FindCompanyByIdUseCase } from 'src/modules/companies/application/find-company-by-id.use-case';
import { FindInvoiceByIdUseCase } from 'src/modules/invoices/application/find-invoice-by-id.use-case';
import { IInvoiceRepository } from 'src/modules/invoices/domain/invoices.repository.interface';
import { InvoiceAlreadyResolvedError } from 'src/modules/invoices/domain/invoices.errors';
import { IPayableAllocationRepository } from 'src/modules/matching/domain/payable-allocations.repository.interface';
import { IPayableRepository } from 'src/modules/matching/domain/payables.repository.interface';
import { RequestActor } from 'src/modules/purchase-requests/application/find-request-by-id.use-case';
import { FindSupplierByIdUseCase } from 'src/modules/suppliers/application/find-supplier-by-id.use-case';
import { InvoiceEntity } from 'src/modules/invoices/domain/invoice.entity';
import { normalizeCnpj } from 'src/shared/domain/cnpj';
import {
  NoOccurrenceDueError,
  RecurringAmountMismatchError,
  RecurringSupplierMismatchError,
} from '../domain/recurring-contracts.errors';
import { IRecurringOccurrenceRepository } from '../domain/recurring-occurrences.repository.interface';
import { FindRecurringContractByIdUseCase } from './find-recurring-contract-by-id.use-case';

const MIN_OVERRIDE_NOTE = 10;

function percentDifference(actual: bigint, expected: bigint): number {
  if (expected === 0n) {
    return actual === 0n ? 0 : 100;
  }

  const diff = actual - expected;
  const absolute = diff < 0n ? -diff : diff;

  return (Number(absolute) / Number(expected)) * 100;
}

@Injectable()
export class LinkInvoiceToRecurringContractUseCase {
  constructor(
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly findInvoiceByIdUseCase: FindInvoiceByIdUseCase,
    private readonly findRecurringContractByIdUseCase: FindRecurringContractByIdUseCase,
    private readonly recurringOccurrenceRepository: IRecurringOccurrenceRepository,
    private readonly payableRepository: IPayableRepository,
    private readonly payableAllocationRepository: IPayableAllocationRepository,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
    private readonly findSupplierByIdUseCase: FindSupplierByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    invoiceId: string,
    contractId: string,
    actor: RequestActor,
    overrideNote?: string,
  ): Promise<InvoiceEntity> {
    const invoice = await this.findInvoiceByIdUseCase.execute(
      invoiceId,
      actor.companyId,
    );

    if (invoice.status !== InvoiceStatus.RECEIVED) {
      throw new InvoiceAlreadyResolvedError(invoice.status);
    }

    const contract = await this.findRecurringContractByIdUseCase.execute(
      contractId,
      actor.companyId,
    );

    const supplier = await this.findSupplierByIdUseCase.execute(
      contract.supplierId,
      actor.companyId,
    );

    if (normalizeCnpj(supplier.cnpj) !== normalizeCnpj(invoice.issuerCnpj)) {
      throw new RecurringSupplierMismatchError();
    }

    const occurrence =
      await this.recurringOccurrenceRepository.findOldestPending(contractId);

    if (!occurrence) {
      throw new NoOccurrenceDueError();
    }

    const difference = percentDifference(
      invoice.totalAmountCents,
      occurrence.expectedAmountCents,
    );
    const trimmedNote = overrideNote?.trim() ?? '';

    if (difference > 5 && trimmedNote.length < MIN_OVERRIDE_NOTE) {
      throw new RecurringAmountMismatchError(
        occurrence.expectedAmountCents.toString(),
        invoice.totalAmountCents.toString(),
        difference.toFixed(1),
      );
    }

    const company = await this.findCompanyByIdUseCase.execute(actor.companyId);

    const updatedInvoice = await this.invoiceRepository.updateStatus(
      invoice.id,
      InvoiceStatus.MATCHED,
    );

    const payable = await this.payableRepository.create({
      companyId: actor.companyId,
      invoiceId: invoice.id,
      supplierId: contract.supplierId,
      amountCents: invoice.totalAmountCents,
      dueDate: occurrence.dueDate,
      ...(company.autoReleaseOnMatch && {
        status: PayableStatus.RELEASED,
        releaseReason: PayableReleaseReason.RECURRING_CONTRACT,
        releasedById: actor.memberId,
      }),
    });

    await this.payableAllocationRepository.replace(payable.id, [
      {
        costCenterId: contract.costCenterId,
        chartAccountId: contract.chartAccountId,
        amountCents: payable.amountCents,
      },
    ]);

    await this.recurringOccurrenceRepository.markMatched(occurrence.id, {
      invoiceId: invoice.id,
      payableId: payable.id,
      overrideNote: trimmedNote || null,
    });

    await this.auditLogRepository.record({
      companyId: actor.companyId,
      actorId: actor.userId,
      eventType: AuditEventType.RECURRING_OCCURRENCE_MATCHED,
      entityType: AuditEntity.RECURRING_CONTRACT,
      entityId: contract.id,
      newData: {
        invoiceNumber: invoice.number,
        occurrenceId: occurrence.id,
        differencePercent: difference.toFixed(1),
        overrideNote: trimmedNote || null,
      },
    });

    return updatedInvoice;
  }
}
