import type {
  RegistrationStatus,
  TaxRegime,
  TaxRegimeSource,
  ValidationStatus,
} from 'generated/prisma/enums';

export interface SupplierPartner {
  name: string;
  role: string;
  enteredAt: string | null;
}

export class SupplierEntity {
  id: string;
  companyId: string;
  cnpj: string;
  legalName: string;
  tradeName: string | null;
  registrationStatus: RegistrationStatus;
  validationStatus: ValidationStatus;

  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  email: string | null;
  phone: string | null;

  validatedAt: Date | null;
  blocked: boolean;

  openedOn: Date | null;
  legalNature: string | null;
  companySize: string | null;
  shareCapitalCents: bigint | null;
  mainActivityCode: string | null;
  mainActivityDescription: string | null;
  simplesOpted: boolean | null;
  meiOpted: boolean | null;
  taxRegime: TaxRegime;
  taxRegimeSource: TaxRegimeSource | null;
  stateRegistration: string | null;
  municipalRegistration: string | null;
  partners: SupplierPartner[];

  createdAt: Date;
  updatedAt: Date;
}
