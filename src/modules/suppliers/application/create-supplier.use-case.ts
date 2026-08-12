import { Injectable } from '@nestjs/common';
import { RegistrationStatus, ValidationStatus } from 'generated/prisma/enums';
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
