import {
  BankAccountStatus,
  BankAccountType,
  PixKeyType,
} from 'generated/prisma/enums';
import { SupplierBankAccountEntity } from './supplier-bank-account.entity';

export interface CreateSupplierBankAccountData {
  companyId: string;
  supplierId: string;
  bankCode: string;
  branch: string;
  accountNumber: string;
  accountDigit: string | null;
  accountType: BankAccountType;
  holderName: string;
  holderDocument: string;
  pixKeyType: PixKeyType | null;
  pixKey: string | null;
  thirdParty: boolean;
  justification: string | null;
  requestedById: string;
}

export interface ReviewSupplierBankAccountData {
  status: BankAccountStatus;
  reviewedById: string;
  reviewNote: string | null;
}

export abstract class ISupplierBankAccountRepository {
  abstract create(
    data: CreateSupplierBankAccountData,
  ): Promise<SupplierBankAccountEntity>;

  abstract findById(id: string): Promise<SupplierBankAccountEntity | null>;

  abstract listBySupplier(
    supplierId: string,
  ): Promise<SupplierBankAccountEntity[]>;

  abstract review(
    id: string,
    data: ReviewSupplierBankAccountData,
  ): Promise<SupplierBankAccountEntity>;

  abstract archive(id: string): Promise<SupplierBankAccountEntity>;
}
