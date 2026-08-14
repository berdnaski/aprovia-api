const SEQUENCE_PADDING = 4;

export function documentNumberPrefix(prefix: string, year: number): string {
  return `${prefix}-${year}-`;
}

export function buildDocumentNumber(
  prefix: string,
  year: number,
  sequence: number,
): string {
  return `${documentNumberPrefix(prefix, year)}${String(sequence).padStart(SEQUENCE_PADDING, '0')}`;
}

export function nextDocumentNumber(
  prefix: string,
  year: number,
  lastNumber: string | null,
): string {
  if (!lastNumber) {
    return buildDocumentNumber(prefix, year, 1);
  }

  const sequence = Number(
    lastNumber.slice(documentNumberPrefix(prefix, year).length),
  );

  return buildDocumentNumber(
    prefix,
    year,
    Number.isFinite(sequence) ? sequence + 1 : 1,
  );
}
