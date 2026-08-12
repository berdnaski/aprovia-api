const PREFIX = 'REQ';
const SEQUENCE_PADDING = 4;

export function requestNumberPrefix(year: number): string {
  return `${PREFIX}-${year}-`;
}

export function buildRequestNumber(year: number, sequence: number): string {
  return `${requestNumberPrefix(year)}${String(sequence).padStart(SEQUENCE_PADDING, '0')}`;
}

export function nextRequestNumber(
  year: number,
  lastNumber: string | null,
): string {
  if (!lastNumber) {
    return buildRequestNumber(year, 1);
  }

  const sequence = Number(lastNumber.slice(requestNumberPrefix(year).length));

  return buildRequestNumber(year, Number.isFinite(sequence) ? sequence + 1 : 1);
}
