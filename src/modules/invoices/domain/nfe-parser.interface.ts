export interface ParsedNfeTax {
  kind:
    | 'ICMS'
    | 'IPI'
    | 'PIS'
    | 'COFINS'
    | 'ISS'
    | 'IRRF'
    | 'CSLL'
    | 'INSS';
  baseCents: bigint;
  rate: string;
  amountCents: bigint;
}

export interface ParsedNfeItem {
  sequence: number;
  description: string;
  ncm: string | null;
  cfop: string | null;
  quantity: string;
  unit: string;
  unitPriceCents: bigint;
  totalCents: bigint;
  taxes: ParsedNfeTax[];
}

export interface ParsedNfe {
  accessKey: string;
  number: string;
  series: string | null;
  issuedAt: Date;
  issuerCnpj: string;
  issuerName: string;
  recipientCnpj: string;
  totalAmountCents: bigint;
  productsAmountCents: bigint;
  freightCents: bigint;
  insuranceCents: bigint;
  discountCents: bigint;
  items: ParsedNfeItem[];
}

export abstract class INfeParser {
  abstract parse(xml: string): ParsedNfe;
}
