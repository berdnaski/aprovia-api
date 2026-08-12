import type {
  RegistrationStatus,
  ValidationStatus,
} from 'generated/prisma/enums';

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

  createdAt: Date;
  updatedAt: Date;
}
