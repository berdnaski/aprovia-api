import {
  RegistrationStatus,
  TaxRegime,
  TaxRegimeSource,
  ValidationStatus,
} from 'generated/prisma/enums';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { SupplierEntity, SupplierPartner } from './supplier.entity';

export interface SupplierAddressData {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface SupplierFiscalData {
  openedOn?: Date | null;
  legalNature?: string | null;
  companySize?: string | null;
  shareCapitalCents?: bigint | null;
  mainActivityCode?: string | null;
  mainActivityDescription?: string | null;
  simplesOpted?: boolean | null;
  meiOpted?: boolean | null;
  taxRegime?: TaxRegime;
  taxRegimeSource?: TaxRegimeSource | null;
  stateRegistration?: string | null;
  partners?: SupplierPartner[];
}

export interface CreateSupplierData
  extends SupplierAddressData, SupplierFiscalData {
  companyId: string;
  cnpj: string;
  legalName: string;
  tradeName?: string | null;
  registrationStatus: RegistrationStatus;
  validationStatus: ValidationStatus;
  validatedAt: Date | null;
}

export interface UpdateSupplierData
  extends SupplierAddressData, SupplierFiscalData {
  legalName?: string;
  tradeName?: string | null;
  municipalRegistration?: string | null;
}

export interface RefreshSupplierValidationData
  extends SupplierAddressData, SupplierFiscalData {
  legalName?: string;
  tradeName?: string | null;
  registrationStatus: RegistrationStatus;
  validationStatus: ValidationStatus;
  validatedAt: Date | null;
}

export interface ListSuppliersFilter {
  search?: string;
  registrationStatus?: RegistrationStatus;
  validationStatus?: ValidationStatus;
  blocked?: boolean;
  skip: number;
  take: number;
}

export abstract class ISupplierRepository {
  abstract create(
    data: CreateSupplierData,
    context?: TransactionContext,
  ): Promise<SupplierEntity>;

  abstract findById(
    id: string,
    context?: TransactionContext,
  ): Promise<SupplierEntity | null>;

  abstract findByCnpj(
    companyId: string,
    cnpj: string,
    context?: TransactionContext,
  ): Promise<SupplierEntity | null>;

  abstract list(
    companyId: string,
    filter: ListSuppliersFilter,
  ): Promise<Page<SupplierEntity>>;

  abstract listStaleValidations(
    olderThan: Date,
    limit: number,
  ): Promise<SupplierEntity[]>;

  abstract update(
    id: string,
    data: UpdateSupplierData,
    context?: TransactionContext,
  ): Promise<SupplierEntity>;

  abstract refreshValidation(
    id: string,
    data: RefreshSupplierValidationData,
    context?: TransactionContext,
  ): Promise<SupplierEntity>;

  abstract setBlocked(
    id: string,
    blocked: boolean,
    context?: TransactionContext,
  ): Promise<SupplierEntity>;
}
