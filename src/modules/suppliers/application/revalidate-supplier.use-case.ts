import { Injectable } from '@nestjs/common';
import { RegistrationStatus, ValidationStatus } from 'generated/prisma/enums';
import { ICnpjLookupProvider } from '../domain/cnpj-lookup.provider';
import { SupplierEntity } from '../domain/supplier.entity';
import { ISupplierRepository } from '../domain/suppliers.repository.interface';
import { FindSupplierByIdUseCase } from './find-supplier-by-id.use-case';

@Injectable()
export class RevalidateSupplierUseCase {
  constructor(
    private readonly supplierRepository: ISupplierRepository,
    private readonly findSupplierByIdUseCase: FindSupplierByIdUseCase,
    private readonly cnpjLookupProvider: ICnpjLookupProvider,
  ) {}

  async execute(id: string, companyId: string): Promise<SupplierEntity> {
    const supplier = await this.findSupplierByIdUseCase.execute(id, companyId);

    return this.refresh(supplier);
  }

  async refresh(supplier: SupplierEntity): Promise<SupplierEntity> {
    const outcome = await this.cnpjLookupProvider.lookup(supplier.cnpj);

    if (!outcome.ok) {
      return this.supplierRepository.refreshValidation(supplier.id, {
        registrationStatus: supplier.registrationStatus,
        validationStatus: ValidationStatus.FAILED,
        validatedAt: supplier.validatedAt,
      });
    }

    return this.supplierRepository.refreshValidation(supplier.id, {
      legalName: outcome.data.legalName,
      tradeName: outcome.data.tradeName,
      registrationStatus:
        outcome.data.registrationStatus === RegistrationStatus.UNKNOWN
          ? supplier.registrationStatus
          : outcome.data.registrationStatus,
      validationStatus: ValidationStatus.VALIDATED,
      validatedAt: new Date(),
      street: outcome.data.address.street,
      city: outcome.data.address.city,
      state: outcome.data.address.state,
      zipCode: outcome.data.address.zipCode,
      email: outcome.data.email,
      phone: outcome.data.phone,
    });
  }
}
