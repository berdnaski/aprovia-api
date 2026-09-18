import { Injectable } from '@nestjs/common';
import {
  RegistrationStatus,
  TaxRegimeSource,
  ValidationStatus,
} from 'generated/prisma/enums';
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
      openedOn: outcome.data.fiscal.openedOn,
      legalNature: outcome.data.fiscal.legalNature,
      companySize: outcome.data.fiscal.companySize,
      shareCapitalCents: outcome.data.fiscal.shareCapitalCents,
      mainActivityCode: outcome.data.fiscal.mainActivityCode,
      mainActivityDescription: outcome.data.fiscal.mainActivityDescription,
      simplesOpted: outcome.data.fiscal.simplesOpted,
      meiOpted: outcome.data.fiscal.meiOpted,
      taxRegime:
        supplier.taxRegimeSource === TaxRegimeSource.MANUAL
          ? supplier.taxRegime
          : outcome.data.fiscal.taxRegime,
      stateRegistration: outcome.data.stateRegistration,
      partners: outcome.data.fiscal.partners,
    });
  }
}
