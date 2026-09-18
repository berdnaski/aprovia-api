import { Injectable, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { ServiceInvoiceParseFailedError } from '../domain/service-invoices.errors';
import {
  INfseParser,
  ParsedNfse,
  ParsedNfseWithholding,
} from '../domain/nfse-parser.interface';

/**
 * Parser para o XML da NFS-e Padrão Nacional (Sistema Nacional NFS-e / ADN).
 *
 * IMPORTANTE — leia antes de mudar isto:
 * Os campos do corpo da declaração (DPS/infDPS: prest, toma, serv, valores,
 * valores/trib/tribFed) têm confirmação cruzada em múltiplas fontes públicas
 * (documentação de prefeituras aderentes, artigos técnicos de ERPs) e foram
 * mapeados com razoável confiança.
 *
 * O envelope externo (NFSe/infNFSe: atributo da chave de acesso de 50
 * posições, nome do prestador/tomador fora do DPS) NÃO pôde ser confirmado
 * contra um XML real de nota autorizada — a documentação técnica oficial
 * (gov.br/nfse) exige certificado digital pra abrir o Swagger interativo, e
 * o manual em PDF não pôde ser extraído neste ambiente. Este parser tenta
 * caminhos alternativos plausíveis (mesmo padrão do envelope *Proc já usado
 * na NF-e) e registra em `integrityWarnings` sempre que cai num fallback.
 *
 * Antes de usar em produção com clientes reais: pegar uma NFS-e Nacional
 * autorizada de verdade (qualquer prefeitura aderente já emite assim) e
 * validar campo a campo contra este parser.
 *
 * Retenção mapeada com confiança: IRRF (vRetIRRF), INSS/CP (vRetCP), CSLL
 * (vRetCSLL) e ISS retido (tpRetISSQN + vISSQN). PIS/COFINS retidos NÃO são
 * mapeados aqui — a reforma tributária tornou vPis/vCofins informativos
 * (débito próprio do prestador), não retenção, e não achei o campo correto
 * de retenção de PIS/COFINS separado com confiança suficiente pra mapear
 * sem risco de errar o valor.
 */

interface NfsePrestNode {
  CNPJ?: string;
  CPF?: string;
  xNome?: string;
  IM?: string;
  regEspTrib?: string;
  opSimpNac?: string;
}

interface NfseTomaNode {
  CNPJ?: string;
  CPF?: string;
  xNome?: string;
}

interface NfseServNode {
  xDescServ?: string;
  cServ?: { cTribNac?: string; cTribMun?: string };
  cLocPrestacao?: string;
}

interface NfseTribFedNode {
  vRetCP?: string | number;
  vRetIRRF?: string | number;
  vRetCSLL?: string | number;
  vTotTribFed?: string | number;
}

interface NfseValoresNode {
  vServPrest?: { vServ?: string | number };
  vServ?: string | number;
  vDescCondIncond?: {
    vDescCond?: string | number;
    vDescIncond?: string | number;
  };
  vDescCond?: string | number;
  vDescIncond?: string | number;
  vLiq?: string | number;
  trib?: {
    tribMun?: {
      tribISSQN?: string;
      tpRetISSQN?: string;
      pAliq?: string | number;
      vISSQN?: string | number;
    };
    tribFed?: NfseTribFedNode;
  };
}

interface NfseInfDPSNode {
  nDPS?: string | number;
  dCompet?: string;
  dhEmi?: string;
  serie?: string | number;
  prest?: NfsePrestNode;
  toma?: NfseTomaNode;
  serv?: NfseServNode;
  valores?: NfseValoresNode;
}

interface NfseDPSNode {
  infDPS?: NfseInfDPSNode;
}

interface NfseInfNFSeNode {
  Id?: string;
  nNFSe?: string | number;
  cLocEmi?: string;
  dhProc?: string;
  verAplic?: string;
  cVerif?: string;
  DPS?: NfseDPSNode;
  prest?: NfsePrestNode;
  toma?: NfseTomaNode;
}

interface NfseRootNode {
  infNFSe?: NfseInfNFSeNode;
}

interface NfseDocument {
  NFSe?: NfseRootNode;
  nfseProc?: { NFSe?: NfseRootNode };
  infNFSe?: NfseInfNFSeNode;
}

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  parseAttributeValue: false,
};

@Injectable()
export class NfseXmlParser implements INfseParser {
  private readonly logger = new Logger(NfseXmlParser.name);

  parse(xml: string): ParsedNfse {
    const parser = new XMLParser(parserOptions);
    let document: NfseDocument;

    try {
      document = parser.parse(xml) as NfseDocument;
    } catch {
      throw new ServiceInvoiceParseFailedError('o arquivo não é um XML válido');
    }

    const infNFSe =
      document.nfseProc?.NFSe?.infNFSe ??
      document.NFSe?.infNFSe ??
      document.infNFSe;

    if (!infNFSe) {
      throw new ServiceInvoiceParseFailedError(
        'estrutura da NFS-e não encontrada (esperado NFSe/infNFSe)',
      );
    }

    const infDPS = infNFSe.DPS?.infDPS;

    if (!infDPS) {
      throw new ServiceInvoiceParseFailedError(
        'declaração de prestação de serviço (DPS) não encontrada dentro da NFS-e',
      );
    }

    const integrityWarnings: string[] = [];

    const rawKey = (infNFSe.Id ?? '').replace(/^NFS?e?/i, '');
    let accessKey = rawKey;

    if (accessKey.length !== 50) {
      // Fallback: a chave de 50 posições não veio no atributo Id como
      // esperado. Isso é exatamente o ponto sinalizado no comentário do
      // topo do arquivo como não confirmado — sinaliza e segue com uma
      // chave sintética, só pra não travar o cadastro por um campo que
      // não afeta o valor financeiro da nota.
      integrityWarnings.push(
        'Não encontrei a chave de acesso de 50 posições no local esperado do XML (NFSe/infNFSe/@Id). Confira manualmente se esta nota já não foi cadastrada antes.',
      );
      accessKey = [
        infDPS.prest?.CNPJ ?? '00000000000000',
        String(infNFSe.nNFSe ?? infDPS.nDPS ?? ''),
        (infDPS.dCompet ?? '').replace(/\D/g, ''),
      ].join('-');
    }

    const prest = infDPS.prest ?? infNFSe.prest;
    const toma = infDPS.toma ?? infNFSe.toma;

    if (!prest?.CNPJ) {
      throw new ServiceInvoiceParseFailedError('prestador do serviço ausente');
    }

    if (!toma?.CNPJ && !toma?.CPF) {
      throw new ServiceInvoiceParseFailedError('tomador do serviço ausente');
    }

    const issuerName = prest.xNome?.trim();
    if (!issuerName) {
      integrityWarnings.push(
        'O nome do prestador não veio no XML nesta versão do parser — confira o cadastro do fornecedor manualmente.',
      );
    }

    const valores = infDPS.valores;
    const grossAmountCents = this.toCents(
      valores?.vServPrest?.vServ ?? valores?.vServ,
    );
    const discountCents = this.toCents(
      (valores?.vDescCondIncond?.vDescCond ?? valores?.vDescCond ?? 0) as
        | string
        | number,
    ).plus(
      this.toCents(
        (valores?.vDescCondIncond?.vDescIncond ?? valores?.vDescIncond ?? 0) as
          | string
          | number,
      ),
    );

    const tribMun = valores?.trib?.tribMun;
    const issRetained = tribMun?.tpRetISSQN === '2';
    const issAmountCents = this.toCents(tribMun?.vISSQN);

    const tribFed = valores?.trib?.tribFed;
    const withholdings: ParsedNfseWithholding[] = [];

    this.pushWithholding(withholdings, 'IRRF', tribFed?.vRetIRRF, grossAmountCents);
    this.pushWithholding(withholdings, 'INSS', tribFed?.vRetCP, grossAmountCents);
    this.pushWithholding(withholdings, 'CSLL', tribFed?.vRetCSLL, grossAmountCents);

    if (issRetained && issAmountCents.gt(0)) {
      withholdings.push({
        kind: 'ISS_RETIDO',
        baseCents: grossAmountCents.toBigInt(),
        rate: tribMun?.pAliq !== undefined ? this.toDecimalString(tribMun.pAliq, 2) : '0.00',
        amountCents: issAmountCents.toBigInt(),
      });
    }

    const totalWithheldCents = withholdings.reduce(
      (sum, item) => sum + item.amountCents,
      0n,
    );

    const netFromXml = valores?.vLiq !== undefined ? this.toCents(valores.vLiq) : null;
    const computedNet =
      grossAmountCents.toBigInt() - discountCents.toBigInt() - totalWithheldCents;
    const netAmountCents = netFromXml?.toBigInt() ?? computedNet;

    if (netFromXml && netFromXml.toBigInt() !== computedNet) {
      integrityWarnings.push(
        `O valor líquido declarado (${netFromXml.toBigInt()}) não bate com bruto − descontos − retenções (${computedNet}). Confira as retenções manualmente.`,
      );
    }

    const issuedAt = infDPS.dhEmi
      ? new Date(infDPS.dhEmi)
      : infNFSe.dhProc
        ? new Date(infNFSe.dhProc)
        : new Date();

    return {
      accessKey,
      number: String(infNFSe.nNFSe ?? infDPS.nDPS ?? ''),
      verificationCode: infNFSe.cVerif ?? null,
      municipalityCode: infNFSe.cLocEmi ?? infDPS.serv?.cLocPrestacao ?? null,
      issuedAt,
      issuerCnpj: prest.CNPJ,
      issuerName: issuerName ?? '',
      recipientCnpj: toma.CNPJ ?? toma.CPF ?? '',
      serviceDescription: infDPS.serv?.xDescServ ?? '',
      serviceCode:
        infDPS.serv?.cServ?.cTribNac ?? infDPS.serv?.cServ?.cTribMun ?? null,
      grossAmountCents: grossAmountCents.toBigInt(),
      discountCents: discountCents.toBigInt(),
      issRate:
        tribMun?.pAliq !== undefined ? this.toDecimalString(tribMun.pAliq, 2) : null,
      issAmountCents: issAmountCents.toBigInt(),
      issWithheld: issRetained,
      netAmountCents,
      withholdings,
      integrityWarnings,
    };
  }

  private pushWithholding(
    list: ParsedNfseWithholding[],
    kind: ParsedNfseWithholding['kind'],
    raw: string | number | undefined,
    baseCents: Cents,
  ): void {
    const amount = this.toCents(raw);

    if (amount.toBigInt() === 0n) {
      return;
    }

    const base = baseCents.toBigInt();
    const rate =
      base > 0n
        ? (Number((amount.toBigInt() * 10000n) / base) / 100).toFixed(2)
        : '0.00';

    list.push({ kind, baseCents: base, rate, amountCents: amount.toBigInt() });
  }

  private toCents(value: string | number | undefined): Cents {
    if (value === undefined || value === null || value === '') {
      return new Cents(0n);
    }

    const normalized = String(value);
    const [integerPart, decimalPart = ''] = normalized.split('.');
    const cents = (decimalPart + '00').slice(0, 2);
    const sign = integerPart.startsWith('-') ? -1n : 1n;
    const digits = integerPart.replace('-', '') || '0';

    return new Cents(sign * (BigInt(digits) * 100n + BigInt(cents)));
  }

  private toDecimalString(value: string | number, decimals: number): string {
    return Number(value).toFixed(decimals);
  }
}

class Cents {
  constructor(private readonly value: bigint) {}

  plus(other: Cents): Cents {
    return new Cents(this.value + other.value);
  }

  gt(other: number): boolean {
    return this.value > BigInt(other);
  }

  toBigInt(): bigint {
    return this.value;
  }
}
