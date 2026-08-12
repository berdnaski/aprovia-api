import { Injectable } from '@nestjs/common';
import {
  CnpjLookupOutcome,
  ICnpjLookupProvider,
} from 'src/modules/suppliers/domain/cnpj-lookup.provider';
import { InvalidCnpjError } from 'src/modules/suppliers/domain/suppliers.errors';
import { isValidCnpj, normalizeCnpj } from 'src/shared/domain/cnpj';

@Injectable()
export class LookupCompanyCnpjUseCase {
  constructor(private readonly cnpjLookupProvider: ICnpjLookupProvider) {}

  execute(rawCnpj: string): Promise<CnpjLookupOutcome> {
    const cnpj = normalizeCnpj(rawCnpj);

    if (!isValidCnpj(cnpj)) {
      throw new InvalidCnpjError(rawCnpj);
    }

    return this.cnpjLookupProvider.lookup(cnpj);
  }
}
