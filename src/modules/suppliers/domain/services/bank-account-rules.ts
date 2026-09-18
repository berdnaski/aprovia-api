import { PixKeyType } from 'generated/prisma/enums';
import { isValidCnpj, normalizeCnpj } from 'src/shared/domain/cnpj';
import { isValidCpf, normalizeCpf } from 'src/shared/domain/cpf';
import {
  InvalidBankCodeError,
  InvalidHolderDocumentError,
  InvalidPixKeyError,
  ThirdPartyJustificationRequiredError,
} from '../supplier-bank-accounts.errors';

const BANK_CODE_PATTERN = /^\d{3}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?\d{10,14}$/;
const RANDOM_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MIN_JUSTIFICATION = 10;

export interface BankAccountInput {
  bankCode: string;
  holderDocument: string;
  pixKeyType: PixKeyType | null;
  pixKey: string | null;
  thirdParty: boolean;
  justification: string | null;
}

export function assertValidBankAccount(input: BankAccountInput): void {
  if (!BANK_CODE_PATTERN.test(input.bankCode)) {
    throw new InvalidBankCodeError(input.bankCode);
  }

  const document = input.holderDocument.replace(/\D/g, '');
  const validDocument =
    document.length === 14
      ? isValidCnpj(normalizeCnpj(document))
      : document.length === 11
        ? isValidCpf(normalizeCpf(document))
        : false;

  if (!validDocument) {
    throw new InvalidHolderDocumentError();
  }

  if (input.pixKeyType && input.pixKey) {
    if (!isValidPixKey(input.pixKeyType, input.pixKey)) {
      throw new InvalidPixKeyError(input.pixKeyType);
    }
  }

  if (
    input.thirdParty &&
    (input.justification ?? '').trim().length < MIN_JUSTIFICATION
  ) {
    throw new ThirdPartyJustificationRequiredError();
  }
}

function isValidPixKey(type: PixKeyType, key: string): boolean {
  switch (type) {
    case PixKeyType.CNPJ:
      return isValidCnpj(normalizeCnpj(key));
    case PixKeyType.CPF:
      return isValidCpf(normalizeCpf(key));
    case PixKeyType.EMAIL:
      return EMAIL_PATTERN.test(key);
    case PixKeyType.PHONE:
      return PHONE_PATTERN.test(key.replace(/\D/g, ''));
    case PixKeyType.RANDOM:
      return RANDOM_KEY_PATTERN.test(key);
    default:
      return false;
  }
}
