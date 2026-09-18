import { Injectable } from '@nestjs/common';
import { SupplierBankAccountEntity } from '../domain/supplier-bank-account.entity';
import { ISupplierBankAccountRepository } from '../domain/supplier-bank-accounts.repository.interface';
import { FindSupplierByIdUseCase } from './find-supplier-by-id.use-case';

@Injectable()
export class ListBankAccountsUseCase {
  constructor(
    private readonly supplierBankAccountRepository: ISupplierBankAccountRepository,
    private readonly findSupplierByIdUseCase: FindSupplierByIdUseCase,
  ) {}

  async execute(
    supplierId: string,
    companyId: string,
  ): Promise<SupplierBankAccountEntity[]> {
    await this.findSupplierByIdUseCase.execute(supplierId, companyId);

    return this.supplierBankAccountRepository.listBySupplier(supplierId);
  }
}
