export interface ParsedNfseWithholding {
  kind: 'IRRF' | 'INSS' | 'PIS' | 'COFINS' | 'CSLL' | 'ISS_RETIDO';
  baseCents: bigint;
  rate: string;
  amountCents: bigint;
}

export interface ParsedNfse {
  accessKey: string;
  number: string;
  verificationCode: string | null;
  municipalityCode: string | null;
  issuedAt: Date;

  issuerCnpj: string;
  issuerName: string;
  recipientCnpj: string;

  serviceDescription: string;
  serviceCode: string | null;

  grossAmountCents: bigint;
  discountCents: bigint;
  issRate: string | null;
  issAmountCents: bigint;
  issWithheld: boolean;
  netAmountCents: bigint;

  withholdings: ParsedNfseWithholding[];
  integrityWarnings: string[];
}

export abstract class INfseParser {
  abstract parse(xml: string): ParsedNfse;
}
