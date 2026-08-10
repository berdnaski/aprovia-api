export interface PrismaKnownError {
  code: string;
  meta?: { target?: string[]; field_name?: string; modelName?: string };
}

export function isPrismaKnownError(
  error: unknown,
): error is PrismaKnownError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    (error as { code: string }).code.startsWith('P')
  );
}

/** Violação de restrição de unicidade. */
export const PRISMA_UNIQUE_VIOLATION = 'P2002';

export function isUniqueViolation(error: unknown): boolean {
  return isPrismaKnownError(error) && error.code === PRISMA_UNIQUE_VIOLATION;
}
