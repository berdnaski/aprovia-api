import { Injectable } from '@nestjs/common';
import {
  RegistrationStatus,
  TaxRegime,
  TaxRegimeSource,
  ValidationStatus,
} from 'generated/prisma/enums';
import { isValidCnpj, normalizeCnpj } from 'src/shared/domain/cnpj';
import { isUniqueViolation } from 'src/shared/domain/prisma-error';
import { ICnpjLookupProvider } from '../domain/cnpj-lookup.provider';
import { SupplierEntity } from '../domain/supplier.entity';
import {
  InvalidCnpjError,
  SupplierCnpjTakenError,
} from '../domain/suppliers.errors';
import { ISupplierRepository } from '../domain/suppliers.repository.interface';
import { CreateSupplierDto } from '../dto/create-supplier.dto';

@Injectable()
export class CreateSupplierUseCase {
  constructor(
    private readonly supplierRepository: ISupplierRepository,
    private readonly cnpjLookupProvider: ICnpjLookupProvider,
  ) {}

  async execute(
    companyId: string,
    data: CreateSupplierDto,
  ): Promise<SupplierEntity> {
    const cnpj = normalizeCnpj(data.cnpj);

    if (!isValidCnpj(cnpj)) {
      throw new InvalidCnpjError(data.cnpj);
    }

    const existing = await this.supplierRepository.findByCnpj(companyId, cnpj);

    if (existing) {
      throw new SupplierCnpjTakenError(cnpj);
    }

    const outcome = await this.cnpjLookupProvider.lookup(cnpj);

    const resolved = outcome.ok
      ? {
          legalName: outcome.data.legalName,
          tradeName: outcome.data.tradeName,
          registrationStatus: outcome.data.registrationStatus,
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
          taxRegime: outcome.data.fiscal.taxRegime,
          taxRegimeSource: TaxRegimeSource.RECEITA,
          stateRegistration: outcome.data.stateRegistration,
          partners: outcome.data.fiscal.partners,
        }
      : {
          legalName: data.legalName,
          tradeName: data.tradeName ?? null,
          registrationStatus: RegistrationStatus.UNKNOWN,
          validationStatus: ValidationStatus.FAILED,
          validatedAt: null,
          street: data.street ?? null,
          city: data.city ?? null,
          state: data.state ?? null,
          zipCode: data.zipCode ?? null,
          email: data.email ?? null,
          phone: data.phone ?? null,
          openedOn: null,
          legalNature: null,
          companySize: null,
          shareCapitalCents: null,
          mainActivityCode: null,
          mainActivityDescription: null,
          simplesOpted: null,
          meiOpted: null,
          taxRegime: TaxRegime.UNKNOWN,
          taxRegimeSource: null,
          stateRegistration: null,
          partners: [],
        };

    try {
      return await this.supplierRepository.create({
        companyId,
        cnpj,
        ...resolved,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new SupplierCnpjTakenError(cnpj);
      }
      throw error;
    }
  }
}
