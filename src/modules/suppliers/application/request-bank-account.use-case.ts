import { Injectable } from '@nestjs/common';
import { AuditEventType } from 'generated/prisma/enums';
import { AuditEntity } from 'src/modules/audit/domain/audit-log.entity';
import { IAuditLogRepository } from 'src/modules/audit/domain/audit-logs.repository.interface';
import { SupplierBankAccountEntity } from '../domain/supplier-bank-account.entity';
import { ISupplierBankAccountRepository } from '../domain/supplier-bank-accounts.repository.interface';
import { assertValidBankAccount } from '../domain/services/bank-account-rules';
import { RequestBankAccountDto } from '../dto/request-bank-account.dto';
import { FindSupplierByIdUseCase } from './find-supplier-by-id.use-case';

export interface BankAccountActor {
  memberId: string;
  companyId: string;
  userId: string;
}

@Injectable()
export class RequestBankAccountUseCase {
  constructor(
    private readonly supplierBankAccountRepository: ISupplierBankAccountRepository,
    private readonly findSupplierByIdUseCase: FindSupplierByIdUseCase,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    supplierId: string,
    actor: BankAccountActor,
    data: RequestBankAccountDto,
  ): Promise<SupplierBankAccountEntity> {
    await this.findSupplierByIdUseCase.execute(supplierId, actor.companyId);

    assertValidBankAccount({
      bankCode: data.bankCode,
      holderDocument: data.holderDocument,
      pixKeyType: data.pixKeyType ?? null,
      pixKey: data.pixKey ?? null,
      thirdParty: data.thirdParty ?? false,
      justification: data.justification ?? null,
    });

    const account = await this.supplierBankAccountRepository.create({
      companyId: actor.companyId,
      supplierId,
      bankCode: data.bankCode,
      branch: data.branch,
      accountNumber: data.accountNumber,
      accountDigit: data.accountDigit ?? null,
      accountType: data.accountType,
      holderName: data.holderName,
      holderDocument: data.holderDocument.replace(/\D/g, ''),
      pixKeyType: data.pixKeyType ?? null,
      pixKey: data.pixKey ?? null,
      thirdParty: data.thirdParty ?? false,
      justification: data.justification ?? null,
      requestedById: actor.memberId,
    });

    await this.auditLogRepository.record({
      companyId: actor.companyId,
      actorId: actor.userId,
      eventType: AuditEventType.BANK_ACCOUNT_REQUESTED,
      entityType: AuditEntity.SUPPLIER_BANK_ACCOUNT,
      entityId: account.id,
      newData: {
        supplierId,
        bankCode: account.bankCode,
        thirdParty: account.thirdParty,
      },
    });

    return account;
  }
}
