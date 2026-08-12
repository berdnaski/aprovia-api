import { RegistrationStatus } from 'generated/prisma/enums';

export interface CnpjLookupAddress {
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
}

export interface CnpjLookupResult {
  cnpj: string;
  legalName: string;
  tradeName: string | null;
  registrationStatus: RegistrationStatus;
  address: CnpjLookupAddress;
  email: string | null;
  phone: string | null;
}

export const CnpjLookupFailure = {
  TIMEOUT: 'TIMEOUT',
  UNAVAILABLE: 'UNAVAILABLE',
  NOT_FOUND: 'NOT_FOUND',
  MALFORMED: 'MALFORMED',
} as const;

export type CnpjLookupFailure =
  (typeof CnpjLookupFailure)[keyof typeof CnpjLookupFailure];

export interface CnpjLookupSuccess {
  ok: true;
  data: CnpjLookupResult;
}

export interface CnpjLookupError {
  ok: false;
  failure: CnpjLookupFailure;
  message: string;
}

export type CnpjLookupOutcome = CnpjLookupSuccess | CnpjLookupError;

export abstract class ICnpjLookupProvider {
  abstract lookup(cnpj: string): Promise<CnpjLookupOutcome>;
}
