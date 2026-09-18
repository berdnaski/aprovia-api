import { Injectable } from '@nestjs/common';
import { AuditEventType, BankAccountStatus } from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { ValidationError } from 'src/shared/domain/errors/domain.error';
import { SupplierBankAccountEntity } from '../domain/supplier-bank-account.entity';
import {
  BankAccountNotPendingError,
  SameReviewerError,
} from '../domain/supplier-bank-accounts.errors';
import { ISupplierBankAccountRepository } from '../domain/supplier-bank-accounts.repository.interface';
import { FindBankAccountByIdUseCase } from './find-bank-account-by-id.use-case';
import { BankAccountActor } from './request-bank-account.use-case';

const MIN_REJECT_NOTE = 10;

@Injectable()
export class ReviewBankAccountUseCase {
  constructor(
    private readonly supplierBankAccountRepository: ISupplierBankAccountRepository,
    private readonly findBankAccountByIdUseCase: FindBankAccountByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    id: string,
    actor: BankAccountActor,
    approve: boolean,
    note: string | null,
  ): Promise<SupplierBankAccountEntity> {
    const account = await this.findBankAccountByIdUseCase.execute(
      id,
      actor.companyId,
    );

    if (account.status !== BankAccountStatus.PENDING) {
      throw new BankAccountNotPendingError();
    }

    if (account.requestedById === actor.memberId) {
      throw new SameReviewerError();
    }

    if (!approve && (note ?? '').trim().length < MIN_REJECT_NOTE) {
      throw new ValidationError(
        `Explique o motivo da recusa em pelo menos ${MIN_REJECT_NOTE} caracteres.`,
      );
    }

    const reviewed = await this.supplierBankAccountRepository.review(id, {
      status: approve ? BankAccountStatus.APPROVED : BankAccountStatus.REJECTED,
      reviewedById: actor.memberId,
      reviewNote: note,
    });

    await this.auditLogRepository.record({
      companyId: actor.companyId,
      actorId: actor.userId,
      eventType: approve
        ? AuditEventType.BANK_ACCOUNT_APPROVED
        : AuditEventType.BANK_ACCOUNT_REJECTED,
      entityType: AuditEntity.SUPPLIER_BANK_ACCOUNT,
      entityId: id,
      newData: { note },
    });

    return reviewed;
  }
}
