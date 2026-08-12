import { Injectable } from '@nestjs/common';
import { isValidCnpj, normalizeCnpj } from 'src/shared/domain/cnpj';
import {
  CnpjLookupOutcome,
  ICnpjLookupProvider,
} from '../domain/cnpj-lookup.provider';
import { SupplierEntity } from '../domain/supplier.entity';
import { InvalidCnpjError } from '../domain/suppliers.errors';
import { ISupplierRepository } from '../domain/suppliers.repository.interface';

export interface CnpjLookupView {
  cnpj: string;
  outcome: CnpjLookupOutcome;
  existingSupplier: SupplierEntity | null;
}

@Injectable()
export class LookupCnpjUseCase {
  constructor(
    private readonly supplierRepository: ISupplierRepository,
    private readonly cnpjLookupProvider: ICnpjLookupProvider,
  ) {}

  async execute(companyId: string, rawCnpj: string): Promise<CnpjLookupView> {
    const cnpj = normalizeCnpj(rawCnpj);

    if (!isValidCnpj(cnpj)) {
      throw new InvalidCnpjError(rawCnpj);
    }

    const existingSupplier = await this.supplierRepository.findByCnpj(
      companyId,
      cnpj,
    );

    if (existingSupplier) {
      return {
        cnpj,
        existingSupplier,
        outcome: {
          ok: true,
          data: {
            cnpj,
            legalName: existingSupplier.legalName,
            tradeName: existingSupplier.tradeName,
            registrationStatus: existingSupplier.registrationStatus,
            address: {
              street: existingSupplier.street,
              city: existingSupplier.city,
              state: existingSupplier.state,
              zipCode: existingSupplier.zipCode,
            },
            email: existingSupplier.email,
            phone: existingSupplier.phone,
          },
        },
      };
    }

    return {
      cnpj,
      existingSupplier: null,
      outcome: await this.cnpjLookupProvider.lookup(cnpj),
    };
  }
}
