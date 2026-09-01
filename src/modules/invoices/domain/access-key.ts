export interface AccessKeyParts {
  uf: string;
  yearMonth: string;
  issuerCnpj: string;
  model: string;
  series: string;
  number: string;
  emissionType: string;
  code: string;
  checkDigit: string;
}

export function splitAccessKey(accessKey: string): AccessKeyParts {
  return {
    uf: accessKey.slice(0, 2),
    yearMonth: accessKey.slice(2, 6),
    issuerCnpj: accessKey.slice(6, 20),
    model: accessKey.slice(20, 22),
    series: accessKey.slice(22, 25),
    number: accessKey.slice(25, 34),
    emissionType: accessKey.slice(34, 35),
    code: accessKey.slice(35, 43),
    checkDigit: accessKey.slice(43, 44),
  };
}

export function accessKeyCheckDigit(first43: string): string {
  let weight = 2;
  let sum = 0;

  for (let index = first43.length - 1; index >= 0; index -= 1) {
    sum += Number(first43[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }

  const rest = sum % 11;

  return String(rest === 0 || rest === 1 ? 0 : 11 - rest);
}

export function isAccessKeyWellFormed(accessKey: string): boolean {
  if (!/^\d{44}$/.test(accessKey)) {
    return false;
  }

  return accessKeyCheckDigit(accessKey.slice(0, 43)) === accessKey.slice(43);
}

export interface AccessKeyMismatch {
  field: string;
  fromKey: string;
  fromXml: string;
}

export function findAccessKeyMismatches(
  accessKey: string,
  xml: {
    issuerCnpj: string;
    number: string;
    series: string | null;
    issuedAt: Date;
  },
): AccessKeyMismatch[] {
  const parts = splitAccessKey(accessKey);
  const mismatches: AccessKeyMismatch[] = [];

  if (parts.issuerCnpj !== xml.issuerCnpj.replace(/\D/g, '')) {
    mismatches.push({
      field: 'CNPJ do emitente',
      fromKey: parts.issuerCnpj,
      fromXml: xml.issuerCnpj,
    });
  }

  if (Number(parts.number) !== Number(xml.number)) {
    mismatches.push({
      field: 'número da nota',
      fromKey: String(Number(parts.number)),
      fromXml: xml.number,
    });
  }

  if (xml.series !== null && Number(parts.series) !== Number(xml.series)) {
    mismatches.push({
      field: 'série',
      fromKey: String(Number(parts.series)),
      fromXml: xml.series,
    });
  }

  const year = String(xml.issuedAt.getUTCFullYear()).slice(2);
  const month = String(xml.issuedAt.getUTCMonth() + 1).padStart(2, '0');

  if (parts.yearMonth !== `${year}${month}`) {
    mismatches.push({
      field: 'ano e mês de emissão',
      fromKey: parts.yearMonth,
      fromXml: `${year}${month}`,
    });
  }

  return mismatches;
}
