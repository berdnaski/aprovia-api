import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import {
  Prisma,
  PrismaClient,
  CompanyMemberRole,
  DecisionType,
  InvoiceParseStatus,
  InvoiceStatus,
  MatchStatus,
  NfeAuthorizationStatus,
  NfeEnvironment,
  PayableReleaseReason,
  PayableStatus,
  PurchaseOrderStatus,
  ReceiptStatus,
  RegistrationStatus,
  RequestStatus,
  StepStatus,
  TaxKind,
  Urgency,
  ValidationStatus,
} from '../generated/prisma/client';
import { ApprovalRoutingService } from '../src/modules/approval-rules/domain/routing/approval-routing.service';
import { accessKeyCheckDigit } from '../src/modules/invoices/domain/access-key';
import { runThreeWayMatch } from '../src/modules/matching/domain/services/three-way-match.service';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEMO_CNPJ = '48219700000155';
const DEMO_PASSWORD = 'Demo@2026';
const DIRECTOR_EMAIL = 'roberto.almeida@nortis.demo';

const routing = new ApprovalRoutingService();

function cents(reais: number): bigint {
  return BigInt(Math.round(reais * 100));
}

function money(value: bigint): string {
  return (Number(value) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function daysAgo(days: number, hour = 10): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function daysFrom(base: Date, days: number): Date {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

function monthWindow(offset: number): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1),
    ),
    end: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 0),
    ),
  };
}

function cnpjCheckDigits(root: string): string {
  const digit = (base: string): number => {
    let weight = base.length - 7;
    let sum = 0;

    for (const char of base) {
      sum += Number(char) * weight;
      weight = weight - 1 < 2 ? 9 : weight - 1;
    }

    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const first = digit(root);
  const second = digit(`${root}${first}`);

  return `${root}${first}${second}`;
}

function buildAccessKey(input: {
  issuedAt: Date;
  issuerCnpj: string;
  series: number;
  number: number;
  randomCode: number;
}): string {
  const year = String(input.issuedAt.getFullYear()).slice(2);
  const month = String(input.issuedAt.getMonth() + 1).padStart(2, '0');

  const first43 = [
    '35',
    `${year}${month}`,
    input.issuerCnpj,
    '55',
    String(input.series).padStart(3, '0'),
    String(input.number).padStart(9, '0'),
    '1',
    String(input.randomCode).padStart(8, '0'),
  ].join('');

  return `${first43}${accessKeyCheckDigit(first43)}`;
}

interface XmlItem {
  description: string;
  quantity: number;
  unit: string;
  unitPriceCents: bigint;
  totalCents: bigint;
  ncm: string;
  cfop: string;
}

function decimals(value: bigint, places = 2): string {
  return (Number(value) / 100).toFixed(places);
}

function buildNfeXml(input: {
  accessKey: string;
  number: number;
  series: number;
  issuedAt: Date;
  issuerCnpj: string;
  issuerName: string;
  issuerCity: string;
  issuerState: string;
  recipientCnpj: string;
  recipientName: string;
  items: XmlItem[];
  productsCents: bigint;
  totalCents: bigint;
  icmsCents: bigint;
  pisCents: bigint;
  cofinsCents: bigint;
  protocol: string;
}): string {
  const emittedAt = input.issuedAt.toISOString().replace(/\.\d{3}Z$/, '-03:00');

  const details = input.items
    .map(
      (item, index) => `      <det nItem="${index + 1}">
        <prod>
          <cProd>${String(index + 1).padStart(5, '0')}</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>${item.description}</xProd>
          <NCM>${item.ncm}</NCM>
          <CFOP>${item.cfop}</CFOP>
          <uCom>${item.unit.toUpperCase()}</uCom>
          <qCom>${item.quantity.toFixed(4)}</qCom>
          <vUnCom>${(Number(item.unitPriceCents) / 100).toFixed(10)}</vUnCom>
          <vProd>${decimals(item.totalCents)}</vProd>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>3</modBC>
              <vBC>${decimals(item.totalCents)}</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>${decimals((item.totalCents * 18n) / 100n)}</vICMS>
            </ICMS00>
          </ICMS>
        </imposto>
      </det>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe versao="4.00" Id="NFe${input.accessKey}">
      <ide>
        <cUF>35</cUF>
        <cNF>${input.accessKey.slice(35, 43)}</cNF>
        <natOp>Venda de mercadoria</natOp>
        <mod>55</mod>
        <serie>${input.series}</serie>
        <nNF>${input.number}</nNF>
        <dhEmi>${emittedAt}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <tpAmb>1</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>9</indPres>
      </ide>
      <emit>
        <CNPJ>${input.issuerCnpj}</CNPJ>
        <xNome>${input.issuerName}</xNome>
        <enderEmit>
          <xMun>${input.issuerCity}</xMun>
          <UF>${input.issuerState}</UF>
        </enderEmit>
        <IE>ISENTO</IE>
        <CRT>3</CRT>
      </emit>
      <dest>
        <CNPJ>${input.recipientCnpj}</CNPJ>
        <xNome>${input.recipientName}</xNome>
        <indIEDest>9</indIEDest>
      </dest>
${details}
      <total>
        <ICMSTot>
          <vBC>${decimals(input.productsCents)}</vBC>
          <vICMS>${decimals(input.icmsCents)}</vICMS>
          <vProd>${decimals(input.productsCents)}</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vIPI>0.00</vIPI>
          <vPIS>${decimals(input.pisCents)}</vPIS>
          <vCOFINS>${decimals(input.cofinsCents)}</vCOFINS>
          <vNF>${decimals(input.totalCents)}</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>0</modFrete>
      </transp>
      <pag>
        <detPag>
          <tPag>15</tPag>
          <vPag>${decimals(input.totalCents)}</vPag>
        </detPag>
      </pag>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>1</tpAmb>
      <chNFe>${input.accessKey}</chNFe>
      <dhRecbto>${emittedAt}</dhRecbto>
      <nProt>${input.protocol}</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;
}

type PersonKey =
  'roberto' | 'ana' | 'caio' | 'rita' | 'marina' | 'bruno' | 'julia';

type Stage =
  | 'ORDER_SENT'
  | 'PARTIAL_RECEIPT'
  | 'RECEIVED'
  | 'INVOICED'
  | 'MATCHED'
  | 'DIVERGENT'
  | 'OVERRIDDEN';

interface CycleItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  ncm: string;
  cfop: string;
}

interface Cycle {
  number: string;
  requester: PersonKey;
  costCenter: string;
  category: string;
  supplier: string;
  title: string;
  description: string;
  urgency: Urgency;
  paymentTerms: string;
  paymentTermDays: number;
  createdDaysAgo: number;
  items: CycleItem[];
  stage: Stage;
  rejectedItem?: { index: number; quantity: number; reason: string };
  invoicedPriceBump?: { index: number; percent: number };
  resolutionNote?: string;
  payment?: 'PAID' | 'RELEASED' | 'BLOCKED';
  deliveryAddress: string;
}

const SUPPLIERS = [
  {
    cnpjRoot: '337104850001',
    legalName: 'Monteiro Vasconcellos Auditores Independentes S/S',
    tradeName: 'Monteiro Vasconcellos',
    city: 'São Paulo',
    state: 'SP',
    street: 'Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi',
    zipCode: '04538133',
    email: 'propostas@mvauditores.com.br',
    phone: '1130457720',
    registrationStatus: RegistrationStatus.ACTIVE,
    validationStatus: ValidationStatus.VALIDATED,
    validatedDaysAgo: 40,
    blocked: false,
  },
  {
    cnpjRoot: '192883460001',
    legalName: 'Arbor Consultoria Tributária LTDA',
    tradeName: 'Arbor Tributária',
    city: 'Porto Alegre',
    state: 'RS',
    street: 'Av. Carlos Gomes, 700 - Boa Vista',
    zipCode: '90480000',
    email: 'contato@arbortributaria.com.br',
    phone: '5132270418',
    registrationStatus: RegistrationStatus.ACTIVE,
    validationStatus: ValidationStatus.VALIDATED,
    validatedDaysAgo: 50,
    blocked: false,
  },
  {
    cnpjRoot: '255601930001',
    legalName: 'Selo Digital Certificação LTDA',
    tradeName: 'Selo Digital',
    city: 'Curitiba',
    state: 'PR',
    street: 'Rua Marechal Deodoro, 630 - Centro',
    zipCode: '80010010',
    email: 'atendimento@selodigital.com.br',
    phone: '4130294410',
    registrationStatus: RegistrationStatus.ACTIVE,
    validationStatus: ValidationStatus.VALIDATED,
    validatedDaysAgo: 25,
    blocked: false,
  },
  {
    cnpjRoot: '210582000001',
    legalName: 'Prime TI Serviços e Licenciamento LTDA',
    tradeName: 'Prime TI',
    city: 'São Paulo',
    state: 'SP',
    street: 'Rua Vergueiro, 1421 - Vila Mariana',
    zipCode: '04101000',
    email: 'comercial@primeti.com.br',
    phone: '1133218890',
    registrationStatus: RegistrationStatus.ACTIVE,
    validationStatus: ValidationStatus.VALIDATED,
    validatedDaysAgo: 70,
    blocked: false,
  },
  {
    cnpjRoot: '324768190001',
    legalName: 'Norte Logística e Transportes S/A',
    tradeName: 'Norte Logística',
    city: 'Recife',
    state: 'PE',
    street: 'Av. Recife, 4200 - Jardim São Paulo',
    zipCode: '50870000',
    email: 'operacoes@nortelog.com.br',
    phone: '8134420115',
    registrationStatus: RegistrationStatus.ACTIVE,
    validationStatus: ValidationStatus.VALIDATED,
    validatedDaysAgo: 64,
    blocked: false,
  },
  {
    cnpjRoot: '114447770001',
    legalName: 'Construmax Materiais de Construção LTDA',
    tradeName: 'Construmax',
    city: 'Belo Horizonte',
    state: 'MG',
    street: 'Av. Amazonas, 3120 - Nova Suíça',
    zipCode: '30180003',
    email: 'vendas@construmax.com.br',
    phone: '3132915540',
    registrationStatus: RegistrationStatus.ACTIVE,
    validationStatus: ValidationStatus.VALIDATED,
    validatedDaysAgo: 55,
    blocked: false,
  },
  {
    cnpjRoot: '405112360001',
    legalName: 'Vetor Comunicação e Mídia LTDA',
    tradeName: 'Vetor Comunicação',
    city: 'Florianópolis',
    state: 'SC',
    street: 'Rod. José Carlos Daux, 5500 - Saco Grande',
    zipCode: '88032005',
    email: 'contato@vetorcom.com.br',
    phone: '4830258877',
    registrationStatus: RegistrationStatus.ACTIVE,
    validationStatus: ValidationStatus.VALIDATED,
    validatedDaysAgo: 22,
    blocked: false,
  },
  {
    cnpjRoot: '286340570001',
    legalName: 'Delta Equipamentos Industriais EIRELI',
    tradeName: 'Delta Equipamentos',
    city: 'Joinville',
    state: 'SC',
    street: 'Rua Dona Francisca, 8300 - Distrito Industrial',
    zipCode: '89219600',
    email: 'atendimento@deltaequip.com.br',
    phone: '4734226690',
    registrationStatus: RegistrationStatus.INACTIVE,
    validationStatus: ValidationStatus.PENDING,
    validatedDaysAgo: null,
    blocked: false,
  },
];

const CYCLES: Cycle[] = [
  {
    number: 'REQ-2026-0025',
    requester: 'bruno',
    costCenter: 'Facilities',
    category: 'Infraestrutura',
    supplier: 'Construmax',
    title: 'Reforma do refeitório',
    description:
      'Troca do piso, das bancadas e da iluminação do refeitório do térreo, interditado parcialmente no último laudo da vigilância sanitária.',
    urgency: Urgency.HIGH,
    paymentTerms: '30 dias',
    paymentTermDays: 30,
    createdDaysAgo: 6,
    items: [
      {
        description: 'Porcelanato antiderrapante 60x60',
        quantity: 180,
        unit: 'm2',
        unitPrice: 95,
        ncm: '69072100',
        cfop: '5102',
      },
      {
        description: 'Bancada em granito com cuba',
        quantity: 4,
        unit: 'un',
        unitPrice: 3225,
        ncm: '68029390',
        cfop: '5102',
      },
      {
        description: 'Luminária LED hermética',
        quantity: 40,
        unit: 'un',
        unitPrice: 200,
        ncm: '94054090',
        cfop: '5102',
      },
    ],
    stage: 'ORDER_SENT',
    deliveryAddress: 'Av. Paulista, 1842 - Térreo - São Paulo/SP',
  },
  {
    number: 'REQ-2026-0018',
    requester: 'ana',
    costCenter: 'Operações',
    category: 'Serviços',
    supplier: 'Arbor Tributária',
    title: 'Recuperação de créditos de PIS e COFINS',
    description:
      'Revisão dos últimos cinco anos de apuração para recuperar créditos de PIS e COFINS sobre os insumos da obra. A consultoria estima um crédito acima de R$ 400 mil.',
    urgency: Urgency.MEDIUM,
    paymentTerms: '30 dias',
    paymentTermDays: 30,
    createdDaysAgo: 44,
    items: [
      {
        description: 'Diagnóstico fiscal dos últimos 5 anos',
        quantity: 1,
        unit: 'sv',
        unitPrice: 12000,
        ncm: '00000000',
        cfop: '5933',
      },
      {
        description: 'Retificação das obrigações e pedido de compensação',
        quantity: 1,
        unit: 'sv',
        unitPrice: 24000,
        ncm: '00000000',
        cfop: '5933',
      },
    ],
    stage: 'MATCHED',
    payment: 'PAID',
    deliveryAddress: 'Av. Paulista, 1842 - 6º andar - São Paulo/SP',
  },
  {
    number: 'REQ-2026-0019',
    requester: 'ana',
    costCenter: 'Facilities',
    category: 'Equipamentos',
    supplier: 'Móveis Sul',
    title: 'Mobiliário da sala do financeiro',
    description:
      'O financeiro mudou para o 6º andar e hoje divide mesas com o comercial. Mesa de reunião para o fechamento mensal, cadeiras e arquivo para os documentos fiscais.',
    urgency: Urgency.MEDIUM,
    paymentTerms: '30 dias',
    paymentTermDays: 30,
    createdDaysAgo: 30,
    items: [
      {
        description: 'Mesa de reunião 2,40m em MDF',
        quantity: 1,
        unit: 'un',
        unitPrice: 4800,
        ncm: '94033000',
        cfop: '5102',
      },
      {
        description: 'Cadeira executiva com apoio de braço',
        quantity: 8,
        unit: 'un',
        unitPrice: 1190,
        ncm: '94013000',
        cfop: '5102',
      },
      {
        description: 'Arquivo de aço 4 gavetas',
        quantity: 2,
        unit: 'un',
        unitPrice: 1340,
        ncm: '94031000',
        cfop: '5102',
      },
    ],
    stage: 'MATCHED',
    payment: 'RELEASED',
    deliveryAddress: 'Av. Paulista, 1842 - 6º andar - São Paulo/SP',
  },
  {
    number: 'REQ-2026-0020',
    requester: 'ana',
    costCenter: 'Tecnologia',
    category: 'Software',
    supplier: 'Selo Digital',
    title: 'Certificados digitais da empresa e da diretoria',
    description:
      'O e-CNPJ vence no fim do mês e sem ele o financeiro não transmite o SPED nem emite nota. Renovação com token para os dois responsáveis legais.',
    urgency: Urgency.HIGH,
    paymentTerms: '15 dias',
    paymentTermDays: 15,
    createdDaysAgo: 21,
    items: [
      {
        description: 'Certificado e-CNPJ A3 - 3 anos',
        quantity: 2,
        unit: 'un',
        unitPrice: 690,
        ncm: '85234990',
        cfop: '5102',
      },
      {
        description: 'Token criptográfico USB',
        quantity: 2,
        unit: 'un',
        unitPrice: 145,
        ncm: '84717019',
        cfop: '5102',
      },
      {
        description: 'Certificado e-CPF A3 - 3 anos',
        quantity: 2,
        unit: 'un',
        unitPrice: 290,
        ncm: '85234990',
        cfop: '5102',
      },
    ],
    stage: 'INVOICED',
    deliveryAddress: 'Av. Paulista, 1842 - 6º andar - São Paulo/SP',
  },
  {
    number: 'REQ-2026-0021',
    requester: 'ana',
    costCenter: 'Tecnologia',
    category: 'Software',
    supplier: 'Prime TI',
    title: 'Sistema de conciliação bancária',
    description:
      'Hoje a conciliação dos quatro bancos é feita em planilha e toma três dias do fechamento. Licença anual com integração ao banco que financia a obra.',
    urgency: Urgency.MEDIUM,
    paymentTerms: '30 dias',
    paymentTermDays: 30,
    createdDaysAgo: 11,
    items: [
      {
        description: 'Licença de conciliação bancária - 12 meses',
        quantity: 12,
        unit: 'un',
        unitPrice: 1450,
        ncm: '85234910',
        cfop: '5102',
      },
      {
        description: 'Implantação e integração bancária',
        quantity: 1,
        unit: 'sv',
        unitPrice: 3600,
        ncm: '00000000',
        cfop: '5933',
      },
    ],
    stage: 'ORDER_SENT',
    deliveryAddress: 'Entrega digital - acesso por e-mail',
  },
  {
    number: 'REQ-1026',
    requester: 'marina',
    costCenter: 'Tecnologia',
    category: 'Equipamentos',
    supplier: 'Tech Distribuidora',
    title: 'Monitores 27" para o time de dados',
    description:
      'O time de dados trabalha em telas de 21" e perde tempo alternando janelas em painéis grandes. Troca das oito estações do 4º andar.',
    urgency: Urgency.MEDIUM,
    paymentTerms: '30 dias após a entrega',
    paymentTermDays: 30,
    createdDaysAgo: 96,
    items: [
      {
        description: 'Monitor LED 27" IPS 2560x1440',
        quantity: 8,
        unit: 'un',
        unitPrice: 1890,
        ncm: '85285210',
        cfop: '5102',
      },
      {
        description: 'Braço articulado para monitor',
        quantity: 8,
        unit: 'un',
        unitPrice: 410,
        ncm: '73269090',
        cfop: '5102',
      },
    ],
    stage: 'MATCHED',
    payment: 'PAID',
    deliveryAddress: 'Av. Paulista, 1842 - 4º andar - São Paulo/SP',
  },
  {
    number: 'REQ-1027',
    requester: 'bruno',
    costCenter: 'Facilities',
    category: 'Materiais',
    supplier: 'Móveis Sul',
    title: 'Armários para o almoxarifado',
    description:
      'Organização do almoxarifado da sede. Hoje o material fica empilhado no chão e a auditoria interna já apontou o risco.',
    urgency: Urgency.LOW,
    paymentTerms: '28 dias',
    paymentTermDays: 28,
    createdDaysAgo: 88,
    items: [
      {
        description: 'Armário de aço 2 portas 198x90cm',
        quantity: 6,
        unit: 'un',
        unitPrice: 1290,
        ncm: '94031000',
        cfop: '5102',
      },
      {
        description: 'Prateleira reforçada 92x30cm',
        quantity: 12,
        unit: 'un',
        unitPrice: 155,
        ncm: '94032000',
        cfop: '5102',
      },
    ],
    stage: 'MATCHED',
    payment: 'PAID',
    deliveryAddress: 'Av. Paulista, 1842 - Térreo - São Paulo/SP',
  },
  {
    number: 'REQ-1028',
    requester: 'marina',
    costCenter: 'Tecnologia',
    category: 'Software',
    supplier: 'Prime TI',
    title: 'Renovação do antivírus corporativo',
    description:
      'Renovação anual das 120 licenças de endpoint. O contrato atual vence no fim do mês e não há carência.',
    urgency: Urgency.HIGH,
    paymentTerms: '30 dias',
    paymentTermDays: 30,
    createdDaysAgo: 68,
    items: [
      {
        description: 'Licença antivírus endpoint - 12 meses',
        quantity: 120,
        unit: 'un',
        unitPrice: 107.5,
        ncm: '85234910',
        cfop: '5102',
      },
    ],
    stage: 'MATCHED',
    payment: 'PAID',
    deliveryAddress: 'Entrega digital - chaves por e-mail',
  },
  {
    number: 'REQ-1029',
    requester: 'julia',
    costCenter: 'Operações',
    category: 'Serviços',
    supplier: 'Norte Logística',
    title: 'Frete de equipamentos para a obra BR-101',
    description:
      'Transporte das cinco cargas de equipamento do centro de distribuição até a frente de obra, com seguro contratado.',
    urgency: Urgency.HIGH,
    paymentTerms: '21 dias',
    paymentTermDays: 21,
    createdDaysAgo: 62,
    items: [
      {
        description: 'Frete rodoviário carga fechada - trecho SP/PE',
        quantity: 5,
        unit: 'vg',
        unitPrice: 3900,
        ncm: '00000000',
        cfop: '5353',
      },
      {
        description: 'Seguro de carga',
        quantity: 1,
        unit: 'sv',
        unitPrice: 4000,
        ncm: '00000000',
        cfop: '5353',
      },
    ],
    stage: 'MATCHED',
    payment: 'PAID',
    deliveryAddress: 'Canteiro BR-101 km 84 - Cabo de Santo Agostinho/PE',
  },
  {
    number: 'REQ-1030',
    requester: 'julia',
    costCenter: 'Operações',
    category: 'Materiais',
    supplier: 'Construmax',
    title: 'Cimento e agregados da fundação',
    description:
      'Insumos da fundação do bloco B. Volume calculado pelo projeto estrutural revisado em julho.',
    urgency: Urgency.HIGH,
    paymentTerms: '30 dias',
    paymentTermDays: 30,
    createdDaysAgo: 52,
    items: [
      {
        description: 'Cimento CP-II 50kg',
        quantity: 800,
        unit: 'sc',
        unitPrice: 41,
        ncm: '25232910',
        cfop: '5102',
      },
      {
        description: 'Brita 1 - m³',
        quantity: 120,
        unit: 'm3',
        unitPrice: 125,
        ncm: '25171000',
        cfop: '5102',
      },
    ],
    stage: 'MATCHED',
    payment: 'RELEASED',
    deliveryAddress: 'Canteiro BR-101 km 84 - Cabo de Santo Agostinho/PE',
  },
  {
    number: 'REQ-1031',
    requester: 'bruno',
    costCenter: 'Facilities',
    category: 'Infraestrutura',
    supplier: 'Móveis Sul',
    title: 'Divisórias acústicas da sala de reunião',
    description:
      'As reuniões vazam som para a bancada de atendimento. Divisórias acústicas nas duas salas do 3º andar.',
    urgency: Urgency.MEDIUM,
    paymentTerms: '30 dias',
    paymentTermDays: 30,
    createdDaysAgo: 30,
    items: [
      {
        description: 'Divisória acústica modular 1,20x2,60m',
        quantity: 15,
        unit: 'un',
        unitPrice: 780,
        ncm: '94036000',
        cfop: '5102',
      },
      {
        description: 'Kit de fixação e acabamento',
        quantity: 15,
        unit: 'kit',
        unitPrice: 170,
        ncm: '73181500',
        cfop: '5102',
      },
    ],
    stage: 'OVERRIDDEN',
    invoicedPriceBump: { index: 0, percent: 6 },
    resolutionNote:
      'Reajuste de 6% no perfil de alumínio confirmado por e-mail pelo fornecedor antes da produção. Diferença aceita para não parar a obra.',
    payment: 'RELEASED',
    deliveryAddress: 'Av. Paulista, 1842 - 3º andar - São Paulo/SP',
  },
  {
    number: 'REQ-1032',
    requester: 'marina',
    costCenter: 'Tecnologia',
    category: 'Infraestrutura',
    supplier: 'Tech Distribuidora',
    title: 'Switches de rede da sede',
    description:
      'Substituição dos switches do rack principal. Os atuais estão fora de suporte e derrubaram a rede duas vezes no trimestre.',
    urgency: Urgency.HIGH,
    paymentTerms: '30 dias',
    paymentTermDays: 30,
    createdDaysAgo: 26,
    items: [
      {
        description: 'Switch gerenciável 24 portas PoE+',
        quantity: 12,
        unit: 'un',
        unitPrice: 2350,
        ncm: '85176294',
        cfop: '5102',
      },
      {
        description: 'Módulo SFP+ 10G',
        quantity: 12,
        unit: 'un',
        unitPrice: 250,
        ncm: '85176294',
        cfop: '5102',
      },
    ],
    stage: 'DIVERGENT',
    rejectedItem: {
      index: 0,
      quantity: 1,
      reason: 'Uma unidade chegou com a carcaça amassada e a porta 1 sem link.',
    },
    deliveryAddress: 'Av. Paulista, 1842 - Data center - São Paulo/SP',
  },
  {
    number: 'REQ-1033',
    requester: 'marina',
    costCenter: 'Tecnologia',
    category: 'Serviços',
    supplier: 'Prime TI',
    title: 'Suporte técnico mensal do parque de TI',
    description:
      'Contrato de suporte presencial para as 180 estações da sede, com SLA de 4 horas.',
    urgency: Urgency.MEDIUM,
    paymentTerms: '30 dias',
    paymentTermDays: 30,
    createdDaysAgo: 14,
    items: [
      {
        description: 'Suporte técnico presencial - mensalidade',
        quantity: 1,
        unit: 'mes',
        unitPrice: 8700,
        ncm: '00000000',
        cfop: '5933',
      },
    ],
    stage: 'INVOICED',
    deliveryAddress: 'Av. Paulista, 1842 - São Paulo/SP',
  },
  {
    number: 'REQ-1034',
    requester: 'julia',
    costCenter: 'Operações',
    category: 'Serviços',
    supplier: 'Norte Logística',
    title: 'Manutenção preventiva dos geradores',
    description:
      'Revisão dos quatro geradores do canteiro antes do período de chuva, com troca de filtros e óleo.',
    urgency: Urgency.MEDIUM,
    paymentTerms: '30 dias',
    paymentTermDays: 30,
    createdDaysAgo: 9,
    items: [
      {
        description: 'Manutenção preventiva de gerador 250 kVA',
        quantity: 4,
        unit: 'un',
        unitPrice: 7250,
        ncm: '00000000',
        cfop: '5915',
      },
      {
        description: 'Kit de filtros e óleo lubrificante',
        quantity: 4,
        unit: 'kit',
        unitPrice: 1375,
        ncm: '84212300',
        cfop: '5102',
      },
    ],
    stage: 'MATCHED',
    payment: 'RELEASED',
    deliveryAddress: 'Canteiro BR-101 km 84 - Cabo de Santo Agostinho/PE',
  },
  {
    number: 'REQ-1035',
    requester: 'julia',
    costCenter: 'Marketing',
    category: 'Marketing',
    supplier: 'Vetor Comunicação',
    title: 'Campanha institucional no LinkedIn',
    description:
      'Campanha de três meses para atrair engenheiros de campo. Criação, mídia e relatório mensal.',
    urgency: Urgency.MEDIUM,
    paymentTerms: '7 dias',
    paymentTermDays: 7,
    createdDaysAgo: 8,
    items: [
      {
        description: 'Criação de peças e roteiro',
        quantity: 1,
        unit: 'sv',
        unitPrice: 6500,
        ncm: '00000000',
        cfop: '5933',
      },
      {
        description: 'Verba de mídia - 3 meses',
        quantity: 3,
        unit: 'mes',
        unitPrice: 5000,
        ncm: '00000000',
        cfop: '5933',
      },
    ],
    stage: 'MATCHED',
    payment: 'RELEASED',
    deliveryAddress: 'Entrega digital - relatórios por e-mail',
  },
  {
    number: 'REQ-1036',
    requester: 'marina',
    costCenter: 'Tecnologia',
    category: 'Software',
    supplier: 'Tech Distribuidora',
    title: 'Renovação de licenças do time de dados',
    description:
      'Renovação das licenças da suíte de BI usada pelo time de dados e pela diretoria.',
    urgency: Urgency.MEDIUM,
    paymentTerms: '30 dias',
    paymentTermDays: 30,
    createdDaysAgo: 7,
    items: [
      {
        description: 'Licença suíte de BI - 12 meses',
        quantity: 24,
        unit: 'un',
        unitPrice: 650,
        ncm: '85234910',
        cfop: '5102',
      },
    ],
    stage: 'ORDER_SENT',
    deliveryAddress: 'Entrega digital - chaves por e-mail',
  },
];

interface OpenRequest {
  number: string;
  requester: PersonKey;
  costCenter: string;
  category: string;
  supplier?: string;
  title: string;
  description: string;
  urgency: Urgency;
  paymentTerms?: string;
  createdDaysAgo: number;
  items: CycleItem[];
  outcome: 'PENDING' | 'CHANGES_REQUESTED' | 'REJECTED' | 'DRAFT';
  approvedSteps?: number;
  justification?: string;
}

const OPEN_REQUESTS: OpenRequest[] = [
  {
    number: 'REQ-2026-0022',
    requester: 'ana',
    costCenter: 'Operações',
    category: 'Serviços',
    supplier: 'Monteiro Vasconcellos',
    title: 'Auditoria externa das demonstrações de 2026',
    description:
      'Exigência do contrato de financiamento da obra BR-101. O banco pede parecer de auditoria independente até março, e a revisão intermediária precisa começar em outubro.',
    urgency: Urgency.HIGH,
    paymentTerms: '50% no início e 50% na entrega do parecer',
    createdDaysAgo: 1,
    items: [
      {
        description: 'Planejamento e revisão intermediária',
        quantity: 1,
        unit: 'sv',
        unitPrice: 18000,
        ncm: '00000000',
        cfop: '5933',
      },
      {
        description: 'Auditoria final e emissão do parecer',
        quantity: 1,
        unit: 'sv',
        unitPrice: 30000,
        ncm: '00000000',
        cfop: '5933',
      },
    ],
    outcome: 'PENDING',
  },
  {
    number: 'REQ-2026-0023',
    requester: 'ana',
    costCenter: 'Operações',
    category: 'Serviços',
    supplier: 'Arbor Tributária',
    title: 'Treinamento da equipe em reforma tributária',
    description:
      'Curso para as quatro pessoas do fiscal entenderem a transição para CBS e IBS, que muda a apuração a partir de 2027.',
    urgency: Urgency.LOW,
    paymentTerms: '30 dias',
    createdDaysAgo: 5,
    items: [
      {
        description: 'Curso de reforma tributária - 24 horas',
        quantity: 4,
        unit: 'vg',
        unitPrice: 1950,
        ncm: '00000000',
        cfop: '5933',
      },
    ],
    outcome: 'CHANGES_REQUESTED',
    justification:
      'Antes de aprovar, confirme se o curso cobre a regra de transição de 2027 e mande a grade de horas. Veja também se dá para incluir o time de contas a pagar na mesma turma.',
  },
  {
    number: 'REQ-2026-0024',
    requester: 'ana',
    costCenter: 'Facilities',
    category: 'Equipamentos',
    title: 'Impressora multifuncional para o financeiro',
    description:
      'Impressora com digitalização frente e verso para os documentos do fechamento mensal.',
    urgency: Urgency.LOW,
    createdDaysAgo: 0,
    items: [
      {
        description: 'Impressora multifuncional laser duplex',
        quantity: 1,
        unit: 'un',
        unitPrice: 3290,
        ncm: '84433111',
        cfop: '5102',
      },
      {
        description: 'Toner de reposição',
        quantity: 2,
        unit: 'un',
        unitPrice: 420,
        ncm: '84439933',
        cfop: '5102',
      },
    ],
    outcome: 'DRAFT',
  },
  {
    number: 'REQ-2026-0010',
    requester: 'marina',
    costCenter: 'Tecnologia',
    category: 'Equipamentos',
    supplier: 'Tech Distribuidora',
    title: 'Estações de trabalho para o time de BI',
    description:
      'Oito estações novas para o time de BI, que hoje roda modelos pesados em máquinas de 2021 e trava nas cargas maiores.',
    urgency: Urgency.HIGH,
    paymentTerms: '45 dias',
    createdDaysAgo: 3,
    items: [
      {
        description: 'Workstation i7 32GB 1TB NVMe',
        quantity: 8,
        unit: 'un',
        unitPrice: 6950,
        ncm: '84713012',
        cfop: '5102',
      },
      {
        description: 'Placa de vídeo profissional 12GB',
        quantity: 8,
        unit: 'un',
        unitPrice: 800,
        ncm: '84733042',
        cfop: '5102',
      },
    ],
    outcome: 'PENDING',
  },
  {
    number: 'REQ-2026-0011',
    requester: 'julia',
    costCenter: 'Tecnologia',
    category: 'Materiais',
    supplier: 'Tech Distribuidora',
    title: 'Cabos e adaptadores para a sala de reunião',
    description:
      'Reposição de cabos HDMI, adaptadores USB-C e controles remotos das duas salas de reunião do 3º andar.',
    urgency: Urgency.LOW,
    paymentTerms: '15 dias',
    createdDaysAgo: 2,
    items: [
      {
        description: 'Cabo HDMI 2.1 - 3m',
        quantity: 15,
        unit: 'un',
        unitPrice: 89,
        ncm: '85444200',
        cfop: '5102',
      },
      {
        description: 'Adaptador USB-C multiporta',
        quantity: 15,
        unit: 'un',
        unitPrice: 141,
        ncm: '85176294',
        cfop: '5102',
      },
    ],
    outcome: 'PENDING',
  },
  {
    number: 'REQ-2026-0012',
    requester: 'bruno',
    costCenter: 'Facilities',
    category: 'Equipamentos',
    supplier: 'Móveis Sul',
    title: 'Mesas para o novo andar',
    description:
      'Mobiliário do 5º andar, que recebe o time de operações em outubro. Vinte postos com mesa e gaveteiro.',
    urgency: Urgency.MEDIUM,
    paymentTerms: '30 dias',
    createdDaysAgo: 4,
    items: [
      {
        description: 'Mesa reta 1,40x0,70m com passa-fio',
        quantity: 20,
        unit: 'un',
        unitPrice: 940,
        ncm: '94033000',
        cfop: '5102',
      },
      {
        description: 'Gaveteiro móvel 3 gavetas',
        quantity: 20,
        unit: 'un',
        unitPrice: 400,
        ncm: '94033000',
        cfop: '5102',
      },
    ],
    outcome: 'PENDING',
  },
  {
    number: 'REQ-2026-0013',
    requester: 'marina',
    costCenter: 'Tecnologia',
    category: 'Software',
    supplier: 'Prime TI',
    title: 'Licenças de design para o time de produto',
    description:
      'Cinco licenças da ferramenta de design usada pelo time de produto, hoje divididas em contas pessoais.',
    urgency: Urgency.MEDIUM,
    paymentTerms: '30 dias',
    createdDaysAgo: 6,
    items: [
      {
        description: 'Licença de design colaborativo - 12 meses',
        quantity: 5,
        unit: 'un',
        unitPrice: 1580,
        ncm: '85234910',
        cfop: '5102',
      },
    ],
    outcome: 'CHANGES_REQUESTED',
    justification:
      'Cotação de um fornecedor só. Traga mais duas propostas e confirme se as cinco licenças cobrem o time todo até dezembro.',
  },
  {
    number: 'REQ-2026-0014',
    requester: 'bruno',
    costCenter: 'Facilities',
    category: 'Serviços',
    supplier: 'Alfa Serviços',
    title: 'Dedetização trimestral da sede',
    description:
      'Contrato trimestral de controle de pragas nos três andares da sede.',
    urgency: Urgency.LOW,
    paymentTerms: '30 dias',
    createdDaysAgo: 10,
    items: [
      {
        description: 'Controle de pragas - visita trimestral',
        quantity: 3,
        unit: 'sv',
        unitPrice: 1250,
        ncm: '00000000',
        cfop: '5933',
      },
    ],
    outcome: 'REJECTED',
    justification:
      'O fornecedor está com a inscrição suspensa na Receita. Refaça com um fornecedor regular antes de seguir.',
  },
  {
    number: 'REQ-2026-0016',
    requester: 'marina',
    costCenter: 'Tecnologia',
    category: 'Infraestrutura',
    supplier: 'Tech Distribuidora',
    title: 'Nobreak para o rack principal',
    description:
      'O rack fica sem proteção nas quedas de energia da região. Dois nobreaks de 6 kVA com bateria estendida.',
    urgency: Urgency.HIGH,
    paymentTerms: '30 dias',
    createdDaysAgo: 5,
    items: [
      {
        description: 'Nobreak senoidal 6 kVA',
        quantity: 2,
        unit: 'un',
        unitPrice: 8200,
        ncm: '85044021',
        cfop: '5102',
      },
      {
        description: 'Banco de baterias estendido',
        quantity: 2,
        unit: 'un',
        unitPrice: 1250,
        ncm: '85072000',
        cfop: '5102',
      },
    ],
    outcome: 'PENDING',
    approvedSteps: 1,
  },
  {
    number: 'REQ-2026-0017',
    requester: 'julia',
    costCenter: 'Operações',
    category: 'Materiais',
    supplier: 'Construmax',
    title: 'Reposição de EPI da equipe de campo',
    description:
      'Capacetes, botinas e cintos de segurança para os quarenta profissionais do canteiro. O estoque atual cobre duas semanas.',
    urgency: Urgency.HIGH,
    paymentTerms: '15 dias',
    createdDaysAgo: 1,
    items: [
      {
        description: 'Capacete de segurança com jugular',
        quantity: 40,
        unit: 'un',
        unitPrice: 48,
        ncm: '65061000',
        cfop: '5102',
      },
      {
        description: 'Botina de segurança bico composite',
        quantity: 40,
        unit: 'par',
        unitPrice: 72,
        ncm: '64039990',
        cfop: '5102',
      },
    ],
    outcome: 'PENDING',
  },
  {
    number: 'REQ-2026-0015',
    requester: 'marina',
    costCenter: 'Tecnologia',
    category: 'Equipamentos',
    title: 'Headsets para o time de suporte',
    description:
      'Headsets com cancelamento de ruído para os oito atendentes do suporte.',
    urgency: Urgency.LOW,
    createdDaysAgo: 1,
    items: [
      {
        description: 'Headset USB com cancelamento de ruído',
        quantity: 8,
        unit: 'un',
        unitPrice: 390,
        ncm: '85183000',
        cfop: '5102',
      },
    ],
    outcome: 'DRAFT',
  },
];

type MemberRow = {
  id: string;
  user_id: string;
  role: CompanyMemberRole;
  manager_id: string | null;
  approval_limit_cents: bigint;
  absent_from: Date | null;
  absent_until: Date | null;
  substitute_id: string | null;
  name: string;
};

async function main(): Promise<void> {
  const found = await prisma.company.findUnique({ where: { cnpj: DEMO_CNPJ } });

  if (!found) {
    throw new Error(
      'Empresa demo não encontrada. Rode npm run seed:demo antes.',
    );
  }

  const company = found;

  const director = await prisma.user.upsert({
    where: { email: DIRECTOR_EMAIL },
    update: {},
    create: {
      name: 'Roberto Almeida',
      email: DIRECTOR_EMAIL,
      password_hash: await hash(DEMO_PASSWORD, 12),
      email_verified: true,
      terms_accepted_at: daysAgo(60),
    },
  });

  const directorMember =
    (await prisma.companyMember.findFirst({
      where: { company_id: company.id, user_id: director.id },
    })) ??
    (await prisma.companyMember.create({
      data: {
        user_id: director.id,
        company_id: company.id,
        role: CompanyMemberRole.APPROVER,
        approval_limit_cents: cents(500_000),
      },
    }));

  await prisma.companyMember.updateMany({
    where: { company_id: company.id, user: { email: 'ana.lima@nortis.demo' } },
    data: { manager_id: directorMember.id },
  });

  const memberRows = await prisma.companyMember.findMany({
    where: { company_id: company.id },
    include: { user: { select: { name: true } } },
  });

  const members = new Map<PersonKey, MemberRow>();
  const byFirstName: Record<string, PersonKey> = {
    Roberto: 'roberto',
    Ana: 'ana',
    Caio: 'caio',
    Rita: 'rita',
    Marina: 'marina',
    Bruno: 'bruno',
    Júlia: 'julia',
  };

  for (const row of memberRows) {
    const key = byFirstName[row.user.name.split(' ')[0]];

    if (key) {
      members.set(key, { ...row, name: row.user.name });
    }
  }

  for (const key of Object.values(byFirstName)) {
    if (!members.has(key)) {
      throw new Error(`Membro ${key} não encontrado na empresa demo.`);
    }
  }

  const person = (key: PersonKey): MemberRow => members.get(key)!;

  const costCenterRows = await prisma.costCenter.findMany({
    where: { company_id: company.id },
  });
  const costCenters = new Map(costCenterRows.map((row) => [row.name, row]));

  const categoryRows = await prisma.category.findMany({
    where: { company_id: company.id },
  });
  const categories = new Map(categoryRows.map((row) => [row.name, row]));

  const ruleRows = await prisma.approvalRule.findMany({
    where: { company_id: company.id },
  });

  console.log('Completando cadastros...');

  for (const seed of SUPPLIERS) {
    const cnpj = cnpjCheckDigits(seed.cnpjRoot);

    await prisma.supplier.upsert({
      where: { company_id_cnpj: { company_id: company.id, cnpj } },
      update: {},
      create: {
        company_id: company.id,
        cnpj,
        legal_name: seed.legalName,
        trade_name: seed.tradeName,
        registration_status: seed.registrationStatus,
        validation_status: seed.validationStatus,
        street: seed.street,
        city: seed.city,
        state: seed.state,
        zip_code: seed.zipCode,
        email: seed.email,
        phone: seed.phone,
        validated_at:
          seed.validatedDaysAgo === null
            ? null
            : daysAgo(seed.validatedDaysAgo),
        blocked: seed.blocked,
      },
    });
  }

  const supplierRows = await prisma.supplier.findMany({
    where: { company_id: company.id },
  });
  const suppliers = new Map(
    supplierRows.map((row) => [row.trade_name ?? row.legal_name, row]),
  );

  await prisma.costCenterMember.createMany({
    data: [
      {
        cost_center_id: costCenters.get('Marketing')!.id,
        member_id: person('julia').id,
      },
      {
        cost_center_id: costCenters.get('Facilities')!.id,
        member_id: person('caio').id,
      },
    ],
    skipDuplicates: true,
  });

  const budgetCaps: Record<string, { current: number; past: number }> = {
    Tecnologia: { current: 180_000, past: 60_000 },
    Operações: { current: 240_000, past: 90_000 },
    Marketing: { current: 90_000, past: 30_000 },
    Facilities: { current: 180_000, past: 40_000 },
  };

  const budgets = new Map<string, string>();

  for (const [name, costCenter] of costCenters) {
    for (const offset of [-3, -2, -1, 0]) {
      const { start, end } = monthWindow(offset);
      const cap =
        offset === 0 ? budgetCaps[name].current : budgetCaps[name].past;

      const budget = await prisma.budget.upsert({
        where: {
          cost_center_id_period_start: {
            cost_center_id: costCenter.id,
            period_start: start,
          },
        },
        update: { total_amount_cents: cents(cap) },
        create: {
          cost_center_id: costCenter.id,
          period_start: start,
          period_end: end,
          total_amount_cents: cents(cap),
        },
      });

      budgets.set(
        `${name}|${start.getUTCFullYear()}-${start.getUTCMonth()}`,
        budget.id,
      );
    }
  }

  function budgetFor(costCenterName: string, at: Date): string | undefined {
    return budgets.get(
      `${costCenterName}|${at.getFullYear()}-${at.getMonth()}`,
    );
  }

  const hierarchy = memberRows.map((row) => ({
    id: row.id,
    approvalLimitCents: row.approval_limit_cents,
    managerId: row.manager_id,
    absentFrom: row.absent_from,
    absentUntil: row.absent_until,
    substituteId: row.substitute_id,
  }));

  const financeAdmins = memberRows
    .filter((row) => row.role === CompanyMemberRole.FINANCE_ADMIN)
    .map((row) => ({
      id: row.id,
      approvalLimitCents: row.approval_limit_cents,
      managerId: row.manager_id,
      absentFrom: row.absent_from,
      absentUntil: row.absent_until,
      substituteId: row.substitute_id,
    }));

  function routeFor(input: {
    amountCents: bigint;
    requester: PersonKey;
    costCenter: string;
    categoryId: string | null;
    at: Date;
  }) {
    const requesterRow = person(input.requester);
    const costCenter = costCenters.get(input.costCenter)!;

    return routing.route({
      amountCents: input.amountCents,
      requester: {
        id: requesterRow.id,
        approvalLimitCents: requesterRow.approval_limit_cents,
        managerId: requesterRow.manager_id,
        absentFrom: requesterRow.absent_from,
        absentUntil: requesterRow.absent_until,
        substituteId: requesterRow.substitute_id,
      },
      costCenter: { id: costCenter.id, managerId: costCenter.manager_id },
      categoryId: input.categoryId,
      hierarchy,
      rules: ruleRows.map((rule) => ({
        id: rule.id,
        costCenterId: rule.cost_center_id,
        categoryId: rule.category_id,
        minAmountCents: rule.min_amount_cents,
        maxAmountCents: rule.max_amount_cents,
        approverType: rule.approver_type,
        requiresDualApproval: rule.requires_dual_approval,
        isActive: rule.is_active,
      })),
      dualApprovalThresholdCents: company.dual_approval_threshold_cents,
      financeAdmins,
      at: input.at,
    });
  }

  const memberById = new Map(memberRows.map((row) => [row.id, row]));

  const lastOrder = await prisma.purchaseOrder.findFirst({
    where: { company_id: company.id },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  const lastReceipt = await prisma.receipt.findFirst({
    where: { company_id: company.id },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  const lastInvoice = await prisma.invoice.findFirst({
    where: { company_id: company.id },
    orderBy: { number: 'desc' },
    select: { number: true },
  });

  let orderSequence = lastOrder ? Number(lastOrder.number.slice(-4)) : 0;
  let receiptSequence = lastReceipt ? Number(lastReceipt.number.slice(-4)) : 0;
  let invoiceSequence = lastInvoice ? Number(lastInvoice.number) : 3100;
  const audits: Prisma.AuditLogCreateManyInput[] = [];
  const notifications: Prisma.NotificationCreateManyInput[] = [];

  console.log('Criando o ciclo completo de compras...\n');

  for (const cycle of CYCLES) {
    const existing = await prisma.purchaseRequest.findFirst({
      where: { company_id: company.id, number: cycle.number },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    const createdAt = daysAgo(cycle.createdDaysAgo, 9);
    const submittedAt = daysFrom(createdAt, 0);
    submittedAt.setHours(11, 20, 0, 0);
    const approvedAt = daysAgo(cycle.createdDaysAgo - 1, 15);

    const requesterRow = person(cycle.requester);
    const costCenter = costCenters.get(cycle.costCenter)!;
    const category = categories.get(cycle.category)!;
    const supplier = suppliers.get(cycle.supplier)!;

    const itemTotals = cycle.items.map((item) =>
      cents(item.quantity * item.unitPrice),
    );
    const totalCents = itemTotals.reduce((sum, value) => sum + value, 0n);

    const request = await prisma.purchaseRequest.create({
      data: {
        number: cycle.number,
        company_id: company.id,
        requester_id: requesterRow.id,
        cost_center_id: costCenter.id,
        category_id: category.id,
        supplier_id: supplier.id,
        title: cycle.title,
        description: cycle.description,
        total_amount_cents: totalCents,
        urgency: cycle.urgency,
        status: RequestStatus.APPROVED,
        payment_terms: cycle.paymentTerms,
        created_at: createdAt,
        submitted_at: submittedAt,
        finalized_at: approvedAt,
      },
    });

    const requestItems: { id: string }[] = [];

    for (const [index, item] of cycle.items.entries()) {
      requestItems.push(
        await prisma.requestItem.create({
          data: {
            purchase_request_id: request.id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price_cents: cents(item.unitPrice),
            total_cents: itemTotals[index],
            created_at: createdAt,
          },
        }),
      );
    }

    const route = routeFor({
      amountCents: totalCents,
      requester: cycle.requester,
      costCenter: cycle.costCenter,
      categoryId: category.id,
      at: submittedAt,
    });

    const capAtApproval =
      approvedAt.getMonth() === new Date().getMonth()
        ? budgetCaps[cycle.costCenter].current
        : budgetCaps[cycle.costCenter].past;

    const stepHours = 3 * 60 * 60 * 1000;

    for (const [index, step] of route.steps.entries()) {
      const isLast = index === route.steps.length - 1;
      const startedAt = new Date(submittedAt.getTime() + index * stepHours);
      const endedAt = isLast
        ? new Date(approvedAt)
        : new Date(submittedAt.getTime() + (index + 1) * stepHours);

      const created = await prisma.approvalStep.create({
        data: {
          purchase_request_id: request.id,
          expected_approver_id: step.expectedApproverId,
          step_order: step.stepOrder,
          requires_dual_approval: step.requiresDualApproval,
          status: StepStatus.APPROVED,
          started_at: startedAt,
          ended_at: endedAt,
        },
      });

      await prisma.decision.create({
        data: {
          approval_step_id: created.id,
          decider_id: step.expectedApproverId,
          on_behalf_of_id: step.onBehalfOfId,
          type: DecisionType.APPROVED,
          budget_at_time_cents: cents(capAtApproval),
          committed_at_time_cents: 0n,
          available_at_time_cents: cents(capAtApproval),
          decided_at: endedAt,
        },
      });

      audits.push({
        company_id: company.id,
        actor_id: memberById.get(step.expectedApproverId)!.user_id,
        event_type: 'APPROVED',
        entity_type: 'PurchaseRequest',
        entity_id: request.id,
        new_data: { number: cycle.number, stepOrder: step.stepOrder },
        occurred_at: endedAt,
      });
    }

    const budgetId = budgetFor(cycle.costCenter, approvedAt);

    if (budgetId) {
      await prisma.budgetEntry.create({
        data: {
          budget_id: budgetId,
          purchase_request_id: request.id,
          type: 'CONSUMPTION',
          amount_cents: totalCents,
          description: `Aprovação do pedido ${cycle.number}`,
          recorded_by_id: memberById.get(
            route.steps[route.steps.length - 1].expectedApproverId,
          )!.user_id,
          occurred_at: approvedAt,
        },
      });
    }

    audits.push(
      {
        company_id: company.id,
        actor_id: requesterRow.user_id,
        event_type: 'CREATED',
        entity_type: 'PurchaseRequest',
        entity_id: request.id,
        new_data: { number: cycle.number, title: cycle.title },
        occurred_at: createdAt,
      },
      {
        company_id: company.id,
        actor_id: requesterRow.user_id,
        event_type: 'SUBMITTED',
        entity_type: 'PurchaseRequest',
        entity_id: request.id,
        new_data: {
          number: cycle.number,
          totalAmountCents: totalCents.toString(),
        },
        occurred_at: submittedAt,
      },
    );

    orderSequence += 1;
    const orderNumber = `${company.po_number_prefix}-2026-${String(orderSequence).padStart(4, '0')}`;
    const issuedAt = daysFrom(approvedAt, 0);
    issuedAt.setHours(17, 15, 0, 0);
    const sentAt = daysFrom(issuedAt, 1);
    const expectedDeliveryAt = daysFrom(issuedAt, 10);

    const order = await prisma.purchaseOrder.create({
      data: {
        number: orderNumber,
        company_id: company.id,
        purchase_request_id: request.id,
        supplier_id: supplier.id,
        status: PurchaseOrderStatus.SENT,
        total_amount_cents: totalCents,
        issued_by_id: person('ana').id,
        issued_at: issuedAt,
        expected_delivery_at: expectedDeliveryAt,
        sent_to_supplier_at: sentAt,
        delivery_address: cycle.deliveryAddress,
        payment_terms: cycle.paymentTerms,
        created_at: issuedAt,
      },
    });

    const orderItems: {
      id: string;
      description: string;
      quantity: Prisma.Decimal;
      unit_price_cents: bigint;
    }[] = [];

    for (const [index, item] of cycle.items.entries()) {
      orderItems.push(
        await prisma.purchaseOrderItem.create({
          data: {
            purchase_order_id: order.id,
            request_item_id: requestItems[index].id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price_cents: cents(item.unitPrice),
            total_cents: itemTotals[index],
            ncm: item.ncm,
            created_at: issuedAt,
          },
        }),
      );
    }

    audits.push(
      {
        company_id: company.id,
        actor_id: person('ana').user_id,
        event_type: 'PO_ISSUED',
        entity_type: 'PurchaseOrder',
        entity_id: order.id,
        new_data: {
          number: orderNumber,
          totalAmountCents: totalCents.toString(),
        },
        occurred_at: issuedAt,
      },
      {
        company_id: company.id,
        actor_id: person('ana').user_id,
        event_type: 'PO_SENT',
        entity_type: 'PurchaseOrder',
        entity_id: order.id,
        new_data: { number: orderNumber, supplier: supplier.legal_name },
        occurred_at: sentAt,
      },
    );

    notifications.push({
      recipient_id: requesterRow.user_id,
      company_id: company.id,
      event: 'PO_ISSUED',
      title: `Ordem ${orderNumber} enviada ao fornecedor`,
      message: `${cycle.title} foi para ${supplier.trade_name ?? supplier.legal_name}. Entrega prevista para ${expectedDeliveryAt.toLocaleDateString('pt-BR')}.`,
      link: `/ordens-de-compra/${order.id}`,
      dedupe_key: `po-issued-${order.id}`,
      read_at: cycle.createdDaysAgo > 20 ? sentAt : null,
      created_at: sentAt,
    });

    console.log(
      `${cycle.number}  ${cycle.title.padEnd(46)} ${money(totalCents).padStart(14)}  ${orderNumber}`,
    );

    if (cycle.stage === 'ORDER_SENT') {
      continue;
    }

    const receivedAt = daysFrom(sentAt, 5);
    receivedAt.setHours(14, 0, 0, 0);
    receiptSequence += 1;
    const receiptNumber = `REC-2026-${String(receiptSequence).padStart(4, '0')}`;

    const receivedQuantities = cycle.items.map((item, index) => {
      if (cycle.rejectedItem && cycle.rejectedItem.index === index) {
        return item.quantity - cycle.rejectedItem.quantity;
      }

      return item.quantity;
    });

    const hasDivergence = Boolean(cycle.rejectedItem);

    const receipt = await prisma.receipt.create({
      data: {
        number: receiptNumber,
        company_id: company.id,
        purchase_order_id: order.id,
        received_by_id: requesterRow.id,
        received_at: receivedAt,
        status: hasDivergence ? ReceiptStatus.PARTIAL : ReceiptStatus.COMPLETE,
        has_divergence: hasDivergence,
        notes:
          cycle.rejectedItem?.reason ??
          'Conferido item a item contra a ordem de compra.',
        created_at: receivedAt,
      },
    });

    for (const [index, orderItem] of orderItems.entries()) {
      const rejected =
        cycle.rejectedItem && cycle.rejectedItem.index === index
          ? cycle.rejectedItem.quantity
          : 0;

      await prisma.receiptItem.create({
        data: {
          receipt_id: receipt.id,
          purchase_order_item_id: orderItem.id,
          quantity: receivedQuantities[index],
          rejected_quantity: rejected,
          rejection_reason: rejected > 0 ? cycle.rejectedItem!.reason : null,
          created_at: receivedAt,
        },
      });

      await prisma.purchaseOrderItem.update({
        where: { id: orderItem.id },
        data: { received_quantity: receivedQuantities[index] },
      });
    }

    await prisma.purchaseOrder.update({
      where: { id: order.id },
      data: {
        status: hasDivergence
          ? PurchaseOrderStatus.PARTIALLY_RECEIVED
          : PurchaseOrderStatus.RECEIVED,
      },
    });

    audits.push({
      company_id: company.id,
      actor_id: requesterRow.user_id,
      event_type: 'GOODS_RECEIVED',
      entity_type: 'Receipt',
      entity_id: receipt.id,
      new_data: { number: receiptNumber, hasDivergence },
      occurred_at: receivedAt,
    });

    if (hasDivergence) {
      notifications.push({
        recipient_id: person('ana').user_id,
        company_id: company.id,
        event: 'MATCH_DIVERGENT',
        title: `Recebimento ${receiptNumber} com divergência`,
        message: `${requesterRow.name} recusou parte da entrega de ${cycle.title}. ${cycle.rejectedItem!.reason}`,
        link: `/recebimentos/${receipt.id}`,
        dedupe_key: `receipt-divergent-${receipt.id}`,
        read_at: null,
        created_at: receivedAt,
      });
    }

    if (cycle.stage === 'PARTIAL_RECEIPT' || cycle.stage === 'RECEIVED') {
      continue;
    }

    const issuedInvoiceAt = daysFrom(receivedAt, -1);
    issuedInvoiceAt.setHours(9, 30, 0, 0);
    const uploadedAt = daysFrom(receivedAt, 1);
    invoiceSequence += 1;

    const invoiceItems: XmlItem[] = cycle.items.map((item, index) => {
      const bump =
        cycle.invoicedPriceBump && cycle.invoicedPriceBump.index === index
          ? 1 + cycle.invoicedPriceBump.percent / 100
          : 1;
      const unitPriceCents = cents(item.unitPrice * bump);

      return {
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPriceCents,
        totalCents: unitPriceCents * BigInt(item.quantity),
        ncm: item.ncm,
        cfop: item.cfop,
      };
    });

    const productsCents = invoiceItems.reduce(
      (sum, item) => sum + item.totalCents,
      0n,
    );
    const icmsCents = (productsCents * 18n) / 100n;
    const pisCents = (productsCents * 165n) / 10000n;
    const cofinsCents = (productsCents * 76n) / 1000n;

    const invoiceNumber = invoiceSequence;
    const accessKey = buildAccessKey({
      issuedAt: issuedInvoiceAt,
      issuerCnpj: supplier.cnpj,
      series: 1,
      number: invoiceNumber,
      randomCode: 10_000_000 + invoiceNumber * 137,
    });

    const protocol = `135260${String(invoiceNumber).padStart(9, '0')}`;

    const invoice = await prisma.invoice.create({
      data: {
        company_id: company.id,
        purchase_order_id: order.id,
        supplier_id: supplier.id,
        access_key: accessKey,
        number: String(invoiceNumber),
        series: '1',
        issued_at: issuedInvoiceAt,
        issuer_cnpj: supplier.cnpj,
        issuer_name: supplier.legal_name,
        recipient_cnpj: company.cnpj,
        total_amount_cents: productsCents,
        products_amount_cents: productsCents,
        raw_xml: buildNfeXml({
          accessKey,
          number: invoiceNumber,
          series: 1,
          issuedAt: issuedInvoiceAt,
          issuerCnpj: supplier.cnpj,
          issuerName: supplier.legal_name,
          issuerCity: supplier.city ?? 'São Paulo',
          issuerState: supplier.state ?? 'SP',
          recipientCnpj: company.cnpj,
          recipientName: company.legal_name,
          items: invoiceItems,
          productsCents,
          totalCents: productsCents,
          icmsCents,
          pisCents,
          cofinsCents,
          protocol,
        }),
        parse_status: InvoiceParseStatus.PARSED,
        authorization_status: NfeAuthorizationStatus.AUTHORIZED,
        protocol_number: protocol,
        protocol_status_code: '100',
        protocol_reason: 'Autorizado o uso da NF-e',
        protocol_received_at: issuedInvoiceAt,
        environment: NfeEnvironment.PRODUCTION,
        status: InvoiceStatus.RECEIVED,
        uploaded_by_id: person('ana').id,
        uploaded_at: uploadedAt,
        created_at: uploadedAt,
      },
    });

    const invoiceItemRows: {
      id: string;
      description: string;
      quantity: Prisma.Decimal;
      unit_price_cents: bigint;
      total_cents: bigint;
      purchase_order_item_id: string | null;
    }[] = [];

    for (const [index, item] of invoiceItems.entries()) {
      invoiceItemRows.push(
        await prisma.invoiceItem.create({
          data: {
            invoice_id: invoice.id,
            purchase_order_item_id: orderItems[index].id,
            sequence: index + 1,
            description: item.description,
            ncm: item.ncm,
            cfop: item.cfop,
            quantity: item.quantity,
            unit: item.unit,
            unit_price_cents: item.unitPriceCents,
            total_cents: item.totalCents,
            created_at: uploadedAt,
          },
        }),
      );
    }

    await prisma.invoiceTax.createMany({
      data: [
        {
          invoice_id: invoice.id,
          kind: TaxKind.ICMS,
          base_cents: productsCents,
          rate: 18,
          amount_cents: icmsCents,
        },
        {
          invoice_id: invoice.id,
          kind: TaxKind.PIS,
          base_cents: productsCents,
          rate: 1.65,
          amount_cents: pisCents,
        },
        {
          invoice_id: invoice.id,
          kind: TaxKind.COFINS,
          base_cents: productsCents,
          rate: 7.6,
          amount_cents: cofinsCents,
        },
      ],
    });

    audits.push({
      company_id: company.id,
      actor_id: person('ana').user_id,
      event_type: 'INVOICE_UPLOADED',
      entity_type: 'Invoice',
      entity_id: invoice.id,
      new_data: { number: String(invoiceNumber), accessKey },
      occurred_at: uploadedAt,
    });

    if (cycle.stage === 'INVOICED') {
      notifications.push({
        recipient_id: person('ana').user_id,
        company_id: company.id,
        event: 'INVOICE_RECEIVED',
        title: `Nota ${invoiceNumber} aguardando conferência`,
        message: `${supplier.legal_name} emitiu a nota de ${money(productsCents)} referente a ${orderNumber}.`,
        link: `/conferencia`,
        dedupe_key: `invoice-received-${invoice.id}`,
        read_at: null,
        created_at: uploadedAt,
      });
      continue;
    }

    const matchedAt = daysFrom(uploadedAt, 1);
    matchedAt.setHours(11, 0, 0, 0);

    const outcome = runThreeWayMatch({
      orderedItems: orderItems.map((item, index) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPriceCents: item.unit_price_cents,
        receivedQuantity: String(receivedQuantities[index]),
      })),
      invoicedItems: invoiceItemRows.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPriceCents: item.unit_price_cents,
        totalCents: item.total_cents,
        purchaseOrderItemId: item.purchase_order_item_id,
      })),
      orderSupplierId: supplier.id,
      invoiceIssuerSupplierId: supplier.id,
      orderTotalCents: totalCents,
      invoiceTotalCents: productsCents,
      tolerance: {
        priceTolerancePercent: company.price_tolerance_percent.toString(),
        quantityTolerancePercent: company.quantity_tolerance_percent.toString(),
      },
    });

    const receivedAmountCents = orderItems.reduce(
      (sum, item, index) =>
        sum +
        BigInt(
          Math.round(receivedQuantities[index] * Number(item.unit_price_cents)),
        ),
      0n,
    );

    const overridden = cycle.stage === 'OVERRIDDEN';
    const resolvedAt = overridden ? daysFrom(matchedAt, 1) : null;

    const matchResult = await prisma.matchResult.create({
      data: {
        company_id: company.id,
        purchase_order_id: order.id,
        invoice_id: invoice.id,
        status: overridden ? MatchStatus.OVERRIDDEN : outcome.status,
        checked_at: matchedAt,
        price_tolerance_percent: company.price_tolerance_percent,
        quantity_tolerance_percent: company.quantity_tolerance_percent,
        ordered_amount_cents: totalCents,
        received_amount_cents: receivedAmountCents,
        invoiced_amount_cents: productsCents,
        resolved_by_id: overridden ? person('ana').id : null,
        resolved_at: resolvedAt,
        resolution_note: overridden ? cycle.resolutionNote : null,
        created_at: matchedAt,
      },
    });

    for (const divergence of outcome.divergences) {
      await prisma.matchDivergence.create({
        data: {
          match_result_id: matchResult.id,
          kind: divergence.kind,
          purchase_order_item_id: divergence.purchaseOrderItemId,
          invoice_item_id: divergence.invoiceItemId,
          expected_value: divergence.expectedValue,
          actual_value: divergence.actualValue,
          difference_cents: divergence.differenceCents,
          difference_percent: divergence.differencePercent,
          created_at: matchedAt,
        },
      });
    }

    const invoiceStatus = overridden
      ? InvoiceStatus.APPROVED
      : outcome.status === MatchStatus.MATCHED
        ? InvoiceStatus.MATCHED
        : InvoiceStatus.DIVERGENT;

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: invoiceStatus },
    });

    audits.push({
      company_id: company.id,
      actor_id: person('ana').user_id,
      event_type: 'MATCH_COMPLETED',
      entity_type: 'match_result',
      entity_id: matchResult.id,
      new_data: {
        status: matchResult.status,
        divergenceCount: outcome.divergences.length,
      },
      occurred_at: matchedAt,
    });

    if (overridden && resolvedAt) {
      audits.push({
        company_id: company.id,
        actor_id: person('ana').user_id,
        event_type: 'MATCH_OVERRIDDEN',
        entity_type: 'match_result',
        entity_id: matchResult.id,
        new_data: { note: cycle.resolutionNote },
        occurred_at: resolvedAt,
      });
    }

    if (outcome.status === MatchStatus.DIVERGENT && !overridden) {
      notifications.push({
        recipient_id: person('ana').user_id,
        company_id: company.id,
        event: 'MATCH_DIVERGENT',
        title: `Conferência de ${orderNumber} travou o pagamento`,
        message: `A nota ${invoiceNumber} de ${supplier.legal_name} não bate com a ordem. ${outcome.divergences.length} divergência(s) para resolver.`,
        link: `/conferencia/${matchResult.id}`,
        dedupe_key: `match-divergent-${matchResult.id}`,
        read_at: null,
        created_at: matchedAt,
      });
    }

    if (!cycle.payment) {
      continue;
    }

    const dueDate = daysFrom(issuedInvoiceAt, cycle.paymentTermDays);
    dueDate.setHours(0, 0, 0, 0);

    const releasedAt = resolvedAt ?? matchedAt;
    const paidAt = cycle.payment === 'PAID' ? daysFrom(dueDate, -2) : null;

    const payable = await prisma.payable.create({
      data: {
        company_id: company.id,
        invoice_id: invoice.id,
        supplier_id: supplier.id,
        amount_cents: productsCents,
        due_date: dueDate,
        status:
          cycle.payment === 'BLOCKED'
            ? PayableStatus.BLOCKED
            : cycle.payment === 'PAID'
              ? PayableStatus.PAID
              : PayableStatus.RELEASED,
        release_reason:
          cycle.payment === 'BLOCKED' ? null : PayableReleaseReason.MATCHED,
        release_note: overridden ? cycle.resolutionNote : null,
        released_by_id: cycle.payment === 'BLOCKED' ? null : person('ana').id,
        released_at: cycle.payment === 'BLOCKED' ? null : releasedAt,
        paid_at: paidAt,
        created_at: matchedAt,
      },
    });

    if (cycle.payment !== 'BLOCKED') {
      audits.push({
        company_id: company.id,
        actor_id: person('ana').user_id,
        event_type: 'PAYABLE_RELEASED',
        entity_type: 'Payable',
        entity_id: payable.id,
        new_data: {
          amountCents: productsCents.toString(),
          dueDate: dueDate.toISOString(),
        },
        occurred_at: releasedAt,
      });
    }

    if (paidAt) {
      audits.push({
        company_id: company.id,
        actor_id: person('ana').user_id,
        event_type: 'PAYABLE_PAID',
        entity_type: 'Payable',
        entity_id: payable.id,
        new_data: { amountCents: productsCents.toString() },
        occurred_at: paidAt,
      });
    }

    if (cycle.payment === 'RELEASED' && dueDate.getTime() < Date.now()) {
      notifications.push({
        recipient_id: person('ana').user_id,
        company_id: company.id,
        event: 'PAYABLE_DUE',
        title: `Pagamento de ${supplier.trade_name ?? supplier.legal_name} venceu`,
        message: `${money(productsCents)} venceu em ${dueDate.toLocaleDateString('pt-BR')} e continua em aberto.`,
        link: `/contas-a-pagar`,
        dedupe_key: `payable-due-${payable.id}`,
        read_at: null,
        created_at: dueDate,
      });
    }
  }

  console.log('\nCriando os pedidos em andamento...\n');

  for (const open of OPEN_REQUESTS) {
    const existing = await prisma.purchaseRequest.findFirst({
      where: { company_id: company.id, number: open.number },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    const createdAt = daysAgo(open.createdDaysAgo, 9);
    const submittedAt = daysFrom(createdAt, 0);
    submittedAt.setHours(10, 40, 0, 0);

    const requesterRow = person(open.requester);
    const costCenter = costCenters.get(open.costCenter)!;
    const category = categories.get(open.category)!;
    const supplier = open.supplier ? suppliers.get(open.supplier) : undefined;

    const itemTotals = open.items.map((item) =>
      cents(item.quantity * item.unitPrice),
    );
    const totalCents = itemTotals.reduce((sum, value) => sum + value, 0n);
    const isDraft = open.outcome === 'DRAFT';

    const finalizedAt =
      open.outcome === 'REJECTED' ? daysAgo(open.createdDaysAgo - 1, 14) : null;

    const request = await prisma.purchaseRequest.create({
      data: {
        number: open.number,
        company_id: company.id,
        requester_id: requesterRow.id,
        cost_center_id: costCenter.id,
        category_id: category.id,
        supplier_id: supplier?.id,
        title: open.title,
        description: open.description,
        total_amount_cents: totalCents,
        urgency: open.urgency,
        status: RequestStatus[open.outcome],
        payment_terms: open.paymentTerms,
        created_at: createdAt,
        submitted_at: isDraft ? null : submittedAt,
        finalized_at: finalizedAt,
      },
    });

    for (const [index, item] of open.items.entries()) {
      await prisma.requestItem.create({
        data: {
          purchase_request_id: request.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price_cents: cents(item.unitPrice),
          total_cents: itemTotals[index],
          created_at: createdAt,
        },
      });
    }

    audits.push({
      company_id: company.id,
      actor_id: requesterRow.user_id,
      event_type: 'CREATED',
      entity_type: 'PurchaseRequest',
      entity_id: request.id,
      new_data: { number: open.number, title: open.title },
      occurred_at: createdAt,
    });

    if (isDraft) {
      console.log(`${open.number}  ${open.title.padEnd(46)} rascunho`);
      continue;
    }

    audits.push({
      company_id: company.id,
      actor_id: requesterRow.user_id,
      event_type: 'SUBMITTED',
      entity_type: 'PurchaseRequest',
      entity_id: request.id,
      new_data: {
        number: open.number,
        totalAmountCents: totalCents.toString(),
      },
      occurred_at: submittedAt,
    });

    const route = routeFor({
      amountCents: totalCents,
      requester: open.requester,
      costCenter: open.costCenter,
      categoryId: category.id,
      at: submittedAt,
    });

    const decidedAt = finalizedAt ?? daysAgo(open.createdDaysAgo - 1, 14);
    const approvedSteps = open.approvedSteps ?? 0;
    const currentStartedAt =
      approvedSteps === 0 ? submittedAt : daysAgo(open.createdDaysAgo - 1, 11);

    for (const [index, step] of route.steps.entries()) {
      const isDone = index < approvedSteps;
      const isCurrent = index === approvedSteps;
      const closed =
        isCurrent &&
        (open.outcome === 'REJECTED' || open.outcome === 'CHANGES_REQUESTED');

      const status = isDone
        ? StepStatus.APPROVED
        : closed
          ? open.outcome === 'REJECTED'
            ? StepStatus.REJECTED
            : StepStatus.CANCELED
          : index > approvedSteps && open.outcome !== 'PENDING'
            ? StepStatus.CANCELED
            : StepStatus.WAITING;

      const startedAt = isDone
        ? submittedAt
        : isCurrent
          ? currentStartedAt
          : null;

      const created = await prisma.approvalStep.create({
        data: {
          purchase_request_id: request.id,
          expected_approver_id: step.expectedApproverId,
          step_order: step.stepOrder,
          requires_dual_approval: step.requiresDualApproval,
          status,
          started_at: startedAt,
          ended_at: isDone ? currentStartedAt : closed ? decidedAt : null,
          reminder_due_at:
            isCurrent && !closed ? daysFrom(currentStartedAt, 1) : null,
          escalation_due_at:
            isCurrent && !closed ? daysFrom(currentStartedAt, 3) : null,
        },
      });

      if (isDone) {
        await prisma.decision.create({
          data: {
            approval_step_id: created.id,
            decider_id: step.expectedApproverId,
            type: DecisionType.APPROVED,
            budget_at_time_cents: cents(budgetCaps[open.costCenter].current),
            committed_at_time_cents: 0n,
            available_at_time_cents: cents(budgetCaps[open.costCenter].current),
            decided_at: currentStartedAt,
          },
        });

        audits.push({
          company_id: company.id,
          actor_id: memberById.get(step.expectedApproverId)!.user_id,
          event_type: 'APPROVED',
          entity_type: 'PurchaseRequest',
          entity_id: request.id,
          new_data: { number: open.number, stepOrder: step.stepOrder },
          occurred_at: currentStartedAt,
        });
      }

      if (closed) {
        await prisma.decision.create({
          data: {
            approval_step_id: created.id,
            decider_id: step.expectedApproverId,
            type:
              open.outcome === 'REJECTED'
                ? DecisionType.REJECTED
                : DecisionType.CHANGES_REQUESTED,
            justification: open.justification,
            budget_at_time_cents: cents(budgetCaps[open.costCenter].current),
            committed_at_time_cents: 0n,
            available_at_time_cents: cents(budgetCaps[open.costCenter].current),
            decided_at: decidedAt,
          },
        });

        audits.push({
          company_id: company.id,
          actor_id: memberById.get(step.expectedApproverId)!.user_id,
          event_type:
            open.outcome === 'REJECTED' ? 'REJECTED' : 'CHANGES_REQUESTED',
          entity_type: 'PurchaseRequest',
          entity_id: request.id,
          new_data: { number: open.number, justification: open.justification },
          occurred_at: decidedAt,
        });

        notifications.push({
          recipient_id: requesterRow.user_id,
          company_id: company.id,
          event:
            open.outcome === 'REJECTED' ? 'DECISION_MADE' : 'REQUEST_RETURNED',
          title:
            open.outcome === 'REJECTED'
              ? `${open.number} foi reprovado`
              : `${open.number} voltou para você`,
          message: open.justification ?? '',
          link: `/pedidos/${request.id}`,
          dedupe_key: `decision-${request.id}`,
          read_at: null,
          created_at: decidedAt,
        });
      }

      if (isCurrent && !closed) {
        notifications.push({
          recipient_id: memberById.get(step.expectedApproverId)!.user_id,
          company_id: company.id,
          event: 'REQUEST_PENDING',
          title: `${open.number} aguarda sua decisão`,
          message: `${requesterRow.name} pediu ${open.title} no valor de ${money(totalCents)}.`,
          link: `/pedidos/${request.id}`,
          dedupe_key: `pending-${request.id}`,
          read_at: null,
          created_at: currentStartedAt,
        });
      }
    }

    const approverNames = route.steps
      .map(
        (step) =>
          memberById.get(step.expectedApproverId)!.user.name.split(' ')[0],
      )
      .join(' → ');

    console.log(
      `${open.number}  ${open.title.padEnd(46)} ${money(totalCents).padStart(14)}  ${open.outcome} (${approverNames})`,
    );
  }

  const pendingOrder = await prisma.purchaseOrder.findFirst({
    where: { company_id: company.id, number: 'PO-2026-0001' },
    include: { items: true },
  });

  const pendingOrderReceipts = pendingOrder
    ? await prisma.receipt.count({
        where: { purchase_order_id: pendingOrder.id },
      })
    : 1;

  if (
    pendingOrder &&
    pendingOrder.items.length > 0 &&
    pendingOrderReceipts === 0
  ) {
    const receivedAt = daysAgo(2, 15);
    receiptSequence += 1;
    const receiptNumber = `REC-2026-${String(receiptSequence).padStart(4, '0')}`;
    const marina = person('marina');

    const receipt = await prisma.receipt.create({
      data: {
        number: receiptNumber,
        company_id: company.id,
        purchase_order_id: pendingOrder.id,
        received_by_id: marina.id,
        received_at: receivedAt,
        status: ReceiptStatus.PARTIAL,
        has_divergence: false,
        notes:
          'Primeiro servidor entregue. O segundo fica para a próxima remessa, conforme combinado com o fornecedor.',
        created_at: receivedAt,
      },
    });

    const firstItem = pendingOrder.items[0];

    await prisma.receiptItem.create({
      data: {
        receipt_id: receipt.id,
        purchase_order_item_id: firstItem.id,
        quantity: 1,
        created_at: receivedAt,
      },
    });

    await prisma.purchaseOrderItem.update({
      where: { id: firstItem.id },
      data: { received_quantity: 1 },
    });

    await prisma.purchaseOrder.update({
      where: { id: pendingOrder.id },
      data: { status: PurchaseOrderStatus.PARTIALLY_RECEIVED },
    });

    audits.push({
      company_id: company.id,
      actor_id: marina.user_id,
      event_type: 'GOODS_RECEIVED',
      entity_type: 'Receipt',
      entity_id: receipt.id,
      new_data: { number: receiptNumber, partial: true },
      occurred_at: receivedAt,
    });

    console.log(
      `\n${receiptNumber} registrado por Marina na ordem PO-2026-0001 (entrega parcial)`,
    );
  }

  await prisma.auditLog.createMany({
    data: audits,
  });

  await prisma.notification.createMany({
    data: notifications,
    skipDuplicates: true,
  });

  const summary = await Promise.all([
    prisma.purchaseRequest.count({ where: { company_id: company.id } }),
    prisma.purchaseOrder.count({ where: { company_id: company.id } }),
    prisma.receipt.count({ where: { company_id: company.id } }),
    prisma.invoice.count({ where: { company_id: company.id } }),
    prisma.matchResult.count({ where: { company_id: company.id } }),
    prisma.payable.count({ where: { company_id: company.id } }),
    prisma.supplier.count({ where: { company_id: company.id } }),
  ]);

  console.log('\nEmpresa preenchida:');
  console.log(`  ${summary[0]} pedidos`);
  console.log(`  ${summary[1]} ordens de compra`);
  console.log(`  ${summary[2]} recebimentos`);
  console.log(`  ${summary[3]} notas fiscais`);
  console.log(`  ${summary[4]} conferências`);
  console.log(`  ${summary[5]} contas a pagar`);
  console.log(`  ${summary[6]} fornecedores`);
  console.log(`  ${audits.length} eventos de auditoria`);
  console.log(`  ${notifications.length} notificações`);
}

main()
  .catch((error: unknown) => {
    console.error('Falha no seed financeiro:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
