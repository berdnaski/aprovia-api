import { Injectable } from '@nestjs/common';
import { AuditEventType } from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { SupplierBankAccountEntity } from '../domain/supplier-bank-account.entity';
import { ISupplierBankAccountRepository } from '../domain/supplier-bank-accounts.repository.interface';
import { FindBankAccountByIdUseCase } from './find-bank-account-by-id.use-case';
import { BankAccountActor } from './request-bank-account.use-case';

@Injectable()
export class ArchiveBankAccountUseCase {
  constructor(
    private readonly supplierBankAccountRepository: ISupplierBankAccountRepository,
    private readonly findBankAccountByIdUseCase: FindBankAccountByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    id: string,
    actor: BankAccountActor,
  ): Promise<SupplierBankAccountEntity> {
    await this.findBankAccountByIdUseCase.execute(id, actor.companyId);

    const archived = await this.supplierBankAccountRepository.archive(id);

    await this.auditLogRepository.record({
      companyId: actor.companyId,
      actorId: actor.userId,
      eventType: AuditEventType.BANK_ACCOUNT_ARCHIVED,
      entityType: AuditEntity.SUPPLIER_BANK_ACCOUNT,
      entityId: id,
      newData: {},
    });

    return archived;
  }
}
