import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { InvoiceParseFailedError } from '../domain/invoices.errors';
import {
  INfeParser,
  ParsedNfe,
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

interface NfeDocument {
  nfeProc?: { NFe?: NfeRoot };
  NFe?: NfeRoot;
}

interface NfeRoot {
  infNFe?: {
    Id?: string;
    ide?: { nNF?: string | number; serie?: string | number; dhEmi?: string };
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

    return {
      accessKey,
      number: String(infNFe.ide?.nNF ?? ''),
      series: infNFe.ide?.serie ? String(infNFe.ide.serie) : null,
      issuedAt: infNFe.ide?.dhEmi ? new Date(infNFe.ide.dhEmi) : new Date(),
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

    const icmsGroup = imposto.ICMS
      ? Object.values(imposto.ICMS)[0]
      : undefined;

    if (icmsGroup) {
      taxes.push({
        kind: 'ICMS',
        baseCents: this.toCents(icmsGroup.vBC as string | number | undefined),
        rate: this.toDecimalString(icmsGroup.pICMS as string | number | undefined, 2),
        amountCents: this.toCents(icmsGroup.vICMS as string | number | undefined),
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
