const CNPJ_LENGTH = 14;
const FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, '');
}

function checkDigit(digits: string, weights: number[]): number {
  const sum = weights.reduce(
    (total, weight, index) => total + Number(digits[index]) * weight,
    0,
  );
  const remainder = sum % 11;

  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value: string): boolean {
  const digits = normalizeCnpj(value);

  if (digits.length !== CNPJ_LENGTH) {
    return false;
  }

  if (/^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const first = checkDigit(digits.slice(0, 12), FIRST_WEIGHTS);

  if (first !== Number(digits[12])) {
    return false;
  }

  return checkDigit(digits.slice(0, 13), SECOND_WEIGHTS) === Number(digits[13]);
}

export function formatCnpj(value: string): string {
  const digits = normalizeCnpj(value);

  if (digits.length !== CNPJ_LENGTH) {
    return value;
  }

  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  );
}
