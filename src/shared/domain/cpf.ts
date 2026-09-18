const CPF_LENGTH = 11;
const FIRST_WEIGHTS = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_WEIGHTS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '');
}

function checkDigit(digits: string, weights: number[]): number {
  const sum = weights.reduce(
    (total, weight, index) => total + Number(digits[index]) * weight,
    0,
  );
  const remainder = (sum * 10) % 11;

  return remainder === 10 ? 0 : remainder;
}

export function isValidCpf(value: string): boolean {
  const digits = normalizeCpf(value);

  if (digits.length !== CPF_LENGTH) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const first = checkDigit(digits.slice(0, 9), FIRST_WEIGHTS);

  if (first !== Number(digits[9])) {
    return false;
  }

  return checkDigit(digits.slice(0, 10), SECOND_WEIGHTS) === Number(digits[10]);
}

export function formatCpf(value: string): string {
  const digits = normalizeCpf(value);

  if (digits.length !== CPF_LENGTH) {
    return value;
  }

  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}
