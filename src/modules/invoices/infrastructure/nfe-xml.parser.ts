import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import {
  findAccessKeyMismatches,
  isAccessKeyWellFormed,
} from '../domain/access-key';
import {
  InvoiceParseFailedError,
  UnsupportedDocumentModelError,
} from '../domain/invoices.errors';
import {
  INfeParser,
  ParsedNfe,
  ParsedNfeAuthorization,
  ParsedNfeItem,
  ParsedNfeTax,
} from '../domain/nfe-parser.interface';

interface NfeProdNode {
  cProd?: string;
  xProd?: string;
  NCM?: string;
  CFOP?: string;
  uCom?: string;
  qCom?: string | number;
  vUnCom?: string | number;
  vProd?: string | number;
}

interface NfeImpostoNode {
  ICMS?: Record<string, Record<string, unknown>>;
  IPI?: { IPITrib?: Record<string, unknown> };
  PIS?: Record<string, Record<string, unknown>>;
  COFINS?: Record<string, Record<string, unknown>>;
}

interface NfeDetNode {
  prod?: NfeProdNode;
  imposto?: NfeImpostoNode;
}

interface NfeProtNode {
  infProt?: {
    tpAmb?: string;
    chNFe?: string;
    dhRecbto?: string;
    nProt?: string;
    cStat?: string;
    xMotivo?: string;
  };
}

interface NfeDocument {
  nfeProc?: { NFe?: NfeRoot; protNFe?: NfeProtNode };
  NFe?: NfeRoot;
}

interface NfeRoot {
  infNFe?: {
    Id?: string;
    ide?: {
      nNF?: string | number;
      serie?: string | number;
      dhEmi?: string;
      mod?: string | number;
    };
    emit?: { CNPJ?: string; xNome?: string };
    dest?: { CNPJ?: string };
    det?: NfeDetNode | NfeDetNode[];
    total?: {
      ICMSTot?: {
        vNF?: string | number;
        vProd?: string | number;
        vFrete?: string | number;
        vSeg?: string | number;
        vDesc?: string | number;
      };
    };
  };
}

const AUTHORIZED_STATUS = '100';

const SUPPORTED_MODEL = '55';

const KNOWN_MODELS: Record<string, string> = {
  '55': 'NF-e',
  '57': 'CT-e (conhecimento de transporte)',
  '58': 'MDF-e (manifesto de transporte)',
  '65': 'NFC-e (cupom fiscal ao consumidor)',
};

function readAuthorization(
  prot: NfeProtNode | undefined,
): ParsedNfeAuthorization {
  const info = prot?.infProt;

  if (!info?.cStat) {
    return {
      status: 'UNVERIFIED',
      protocolNumber: null,
      statusCode: null,
      reason: null,
      receivedAt: null,
      environment: null,
    };
  }

  return {
    status: info.cStat === AUTHORIZED_STATUS ? 'AUTHORIZED' : 'NOT_AUTHORIZED',
    protocolNumber: info.nProt ?? null,
    statusCode: info.cStat,
    reason: info.xMotivo ?? null,
    receivedAt: info.dhRecbto ? new Date(info.dhRecbto) : null,
    environment:
      info.tpAmb === '1'
        ? 'PRODUCTION'
        : info.tpAmb === '2'
          ? 'HOMOLOGATION'
          : null,
  };
}

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  parseAttributeValue: false,
};

@Injectable()
export class NfeXmlParser implements INfeParser {
  parse(xml: string): ParsedNfe {
    const parser = new XMLParser(parserOptions);
    let document: NfeDocument;

    try {
      document = parser.parse(xml) as NfeDocument;
    } catch {
      throw new InvoiceParseFailedError('o arquivo não é um XML válido');
    }

    const root = document.nfeProc?.NFe ?? document.NFe;
    const infNFe = root?.infNFe;

    if (!infNFe) {
      throw new InvoiceParseFailedError(
        'estrutura da NFe não encontrada (esperado nfeProc/NFe/infNFe)',
      );
    }

    const accessKey = (infNFe.Id ?? '').replace(/^NFe/, '');

    if (accessKey.length !== 44) {
      throw new InvoiceParseFailedError('chave de acesso ausente ou inválida');
    }

    if (!infNFe.emit?.CNPJ || !infNFe.dest?.CNPJ) {
      throw new InvoiceParseFailedError('emitente ou destinatário ausente');
    }

    const model = String(infNFe.ide?.mod ?? accessKey.slice(20, 22));

    if (model !== SUPPORTED_MODEL) {
      const known = KNOWN_MODELS[model];

      throw new UnsupportedDocumentModelError(
        known
          ? `este arquivo é um ${known}, e a conferência trabalha com NF-e (modelo 55)`
          : `modelo de documento ${model} não é conferível aqui, a conferência trabalha com NF-e (modelo 55)`,
      );
    }

    const detList = Array.isArray(infNFe.det)
      ? infNFe.det
      : infNFe.det
        ? [infNFe.det]
        : [];

    if (!detList.length) {
      throw new InvoiceParseFailedError('a nota não tem itens');
    }

    const items = detList.map((det, index) => this.parseItem(det, index + 1));

    const totals = infNFe.total?.ICMSTot;

    const number = String(infNFe.ide?.nNF ?? '');
    const series = infNFe.ide?.serie ? String(infNFe.ide.serie) : null;
    const issuedAt = infNFe.ide?.dhEmi
      ? new Date(infNFe.ide.dhEmi)
      : new Date();

    const authorization = readAuthorization(document.nfeProc?.protNFe);
    const integrityWarnings: string[] = [];

    if (!isAccessKeyWellFormed(accessKey)) {
      integrityWarnings.push(
        'O dígito verificador da chave de acesso não confere.',
      );
    }

    for (const mismatch of findAccessKeyMismatches(accessKey, {
      issuerCnpj: infNFe.emit.CNPJ,
      number,
      series,
      issuedAt,
    })) {
      integrityWarnings.push(
        `A chave de acesso indica ${mismatch.field} ${mismatch.fromKey}, mas o corpo da nota traz ${mismatch.fromXml}.`,
      );
    }

    const protocolKey = document.nfeProc?.protNFe?.infProt?.chNFe;

    if (protocolKey && protocolKey !== accessKey) {
      integrityWarnings.push(
        'A chave do protocolo de autorização não é a mesma do corpo da nota.',
      );
    }

    return {
      accessKey,
      authorization,
      integrityWarnings,
      number,
      series,
      issuedAt,
      issuerCnpj: infNFe.emit.CNPJ,
      issuerName: infNFe.emit.xNome ?? '',
      recipientCnpj: infNFe.dest.CNPJ,
      totalAmountCents: this.toCents(totals?.vNF),
      productsAmountCents: this.toCents(totals?.vProd),
      freightCents: this.toCents(totals?.vFrete),
      insuranceCents: this.toCents(totals?.vSeg),
      discountCents: this.toCents(totals?.vDesc),
      items,
    };
  }

  private parseItem(det: NfeDetNode, sequence: number): ParsedNfeItem {
    const prod = det.prod;

    if (!prod?.xProd) {
      throw new InvoiceParseFailedError(
        `item ${sequence} sem descrição de produto`,
      );
    }

    return {
      sequence,
      description: prod.xProd,
      ncm: prod.NCM ?? null,
      cfop: prod.CFOP ?? null,
      quantity: this.toDecimalString(prod.qCom, 4),
      unit: prod.uCom ?? 'UN',
      unitPriceCents: this.toCents(prod.vUnCom),
      totalCents: this.toCents(prod.vProd),
      taxes: this.parseTaxes(det.imposto),
    };
  }

  private parseTaxes(imposto?: NfeImpostoNode): ParsedNfeTax[] {
    if (!imposto) {
      return [];
    }

    const taxes: ParsedNfeTax[] = [];

    const icmsGroup = imposto.ICMS ? Object.values(imposto.ICMS)[0] : undefined;

    if (icmsGroup) {
      taxes.push({
        kind: 'ICMS',
        baseCents: this.toCents(icmsGroup.vBC as string | number | undefined),
        rate: this.toDecimalString(
          icmsGroup.pICMS as string | number | undefined,
          2,
        ),
        amountCents: this.toCents(
          icmsGroup.vICMS as string | number | undefined,
        ),
      });
    }

    if (imposto.IPI?.IPITrib) {
      const ipi = imposto.IPI.IPITrib;
      taxes.push({
        kind: 'IPI',
        baseCents: this.toCents(ipi.vBC as string | number | undefined),
        rate: this.toDecimalString(ipi.pIPI as string | number | undefined, 2),
        amountCents: this.toCents(ipi.vIPI as string | number | undefined),
      });
    }

    return taxes;
  }

  private toCents(value: string | number | undefined): bigint {
    if (value === undefined || value === null || value === '') {
      return 0n;
    }

    const normalized = String(value);
    const [integerPart, decimalPart = ''] = normalized.split('.');
    const cents = (decimalPart + '00').slice(0, 2);
    const sign = integerPart.startsWith('-') ? -1n : 1n;
    const digits = integerPart.replace('-', '') || '0';

    return sign * (BigInt(digits) * 100n + BigInt(cents));
  }

  private toDecimalString(
    value: string | number | undefined,
    decimals: number,
  ): string {
    if (value === undefined || value === null || value === '') {
      return (0).toFixed(decimals);
    }

    return Number(value).toFixed(decimals);
  }
}
