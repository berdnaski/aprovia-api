import { Module } from '@nestjs/common';
import { ArchiveBankAccountUseCase } from '../application/archive-bank-account.use-case';
import { AssertSupplierUsableUseCase } from '../application/assert-supplier-usable.use-case';
import { CreateSupplierUseCase } from '../application/create-supplier.use-case';
import { FindBankAccountByIdUseCase } from '../application/find-bank-account-by-id.use-case';
import { FindSupplierByIdUseCase } from '../application/find-supplier-by-id.use-case';
import { ListBankAccountsUseCase } from '../application/list-bank-accounts.use-case';
import { ListSuppliersUseCase } from '../application/list-suppliers.use-case';
import { LookupCnpjUseCase } from '../application/lookup-cnpj.use-case';
import { RequestBankAccountUseCase } from '../application/request-bank-account.use-case';
import { ReviewBankAccountUseCase } from '../application/review-bank-account.use-case';
import { RevalidateSupplierUseCase } from '../application/revalidate-supplier.use-case';
import { SetSupplierBlockedUseCase } from '../application/set-supplier-blocked.use-case';
import { UpdateSupplierUseCase } from '../application/update-supplier.use-case';
import { ICnpjLookupProvider } from '../domain/cnpj-lookup.provider';
import { ISupplierBankAccountRepository } from '../domain/supplier-bank-accounts.repository.interface';
import { ISupplierRepository } from '../domain/suppliers.repository.interface';
import { BrasilApiCnpjProvider } from './brasil-api-cnpj.provider';
import { SupplierBankAccountsController } from './supplier-bank-accounts.controller';
import { SuppliersController } from './suppliers.controller';
import { SupplierBankAccountRepository } from './supplier-bank-accounts.repository';
import { SupplierRepository } from './suppliers.repository';

@Module({
  controllers: [SuppliersController, SupplierBankAccountsController],
  providers: [
    { provide: ISupplierRepository, useClass: SupplierRepository },
    { provide: ICnpjLookupProvider, useClass: BrasilApiCnpjProvider },
    {
      provide: ISupplierBankAccountRepository,
      useClass: SupplierBankAccountRepository,
    },
    CreateSupplierUseCase,
    ListSuppliersUseCase,
    FindSupplierByIdUseCase,
    UpdateSupplierUseCase,
    SetSupplierBlockedUseCase,
    RevalidateSupplierUseCase,
    LookupCnpjUseCase,
    AssertSupplierUsableUseCase,
    RequestBankAccountUseCase,
    ReviewBankAccountUseCase,
    ArchiveBankAccountUseCase,
    ListBankAccountsUseCase,
    FindBankAccountByIdUseCase,
  ],
  exports: [
    ISupplierRepository,
    ICnpjLookupProvider,
    FindSupplierByIdUseCase,
    AssertSupplierUsableUseCase,
    RevalidateSupplierUseCase,
  ],
})
export class SuppliersModule {}
