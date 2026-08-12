import { Module } from '@nestjs/common';
import { AssertSupplierUsableUseCase } from '../application/assert-supplier-usable.use-case';
import { CreateSupplierUseCase } from '../application/create-supplier.use-case';
import { FindSupplierByIdUseCase } from '../application/find-supplier-by-id.use-case';
import { ListSuppliersUseCase } from '../application/list-suppliers.use-case';
import { LookupCnpjUseCase } from '../application/lookup-cnpj.use-case';
import { RevalidateSupplierUseCase } from '../application/revalidate-supplier.use-case';
import { SetSupplierBlockedUseCase } from '../application/set-supplier-blocked.use-case';
import { UpdateSupplierUseCase } from '../application/update-supplier.use-case';
import { ICnpjLookupProvider } from '../domain/cnpj-lookup.provider';
import { ISupplierRepository } from '../domain/suppliers.repository.interface';
import { BrasilApiCnpjProvider } from './brasil-api-cnpj.provider';
import { SuppliersController } from './suppliers.controller';
import { SupplierRepository } from './suppliers.repository';

@Module({
  controllers: [SuppliersController],
  providers: [
    { provide: ISupplierRepository, useClass: SupplierRepository },
    { provide: ICnpjLookupProvider, useClass: BrasilApiCnpjProvider },
    CreateSupplierUseCase,
    ListSuppliersUseCase,
    FindSupplierByIdUseCase,
    UpdateSupplierUseCase,
    SetSupplierBlockedUseCase,
    RevalidateSupplierUseCase,
    LookupCnpjUseCase,
    AssertSupplierUsableUseCase,
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
