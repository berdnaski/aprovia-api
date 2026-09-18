import { Injectable } from '@nestjs/common';
import { NotFoundError } from 'src/shared/domain/errors/domain.error';
import { SupplierBankAccountEntity } from '../domain/supplier-bank-account.entity';
import { ISupplierBankAccountRepository } from '../domain/supplier-bank-accounts.repository.interface';

@Injectable()
export class FindBankAccountByIdUseCase {
  constructor(
    private readonly supplierBankAccountRepository: ISupplierBankAccountRepository,
  ) {}

  async execute(
    id: string,
    companyId: string,
  ): Promise<SupplierBankAccountEntity> {
    const account = await this.supplierBankAccountRepository.findById(id);

    if (!account || account.companyId !== companyId) {
      throw new NotFoundError('Conta bancária', id);
    }

    return account;
  }
}
