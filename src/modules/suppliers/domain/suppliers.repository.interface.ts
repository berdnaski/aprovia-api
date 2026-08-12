import { RegistrationStatus, ValidationStatus } from 'generated/prisma/enums';
import { Page } from 'src/shared/dto/pagination-query.dto';
import { TransactionContext } from 'src/shared/domain/transaction.manager';
import { SupplierEntity } from './supplier.entity';

export interface SupplierAddressData {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface CreateSupplierData extends SupplierAddressData {
  companyId: string;
  cnpj: string;
  legalName: string;
  tradeName?: string | null;
  registrationStatus: RegistrationStatus;
  validationStatus: ValidationStatus;
  validatedAt: Date | null;
}

export interface UpdateSupplierData extends SupplierAddressData {
  legalName?: string;
  tradeName?: string | null;
}

export interface RefreshSupplierValidationData extends SupplierAddressData {
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
