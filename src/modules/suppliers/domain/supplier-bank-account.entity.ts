import {
  BankAccountStatus,
  BankAccountType,
  PixKeyType,
} from 'generated/prisma/enums';

export class SupplierBankAccountEntity {
  id: string;
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
  status: BankAccountStatus;
  requestedById: string;
  requestedAt: Date;
  reviewedById: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
