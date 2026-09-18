import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  ChartAccountKind,
  TaxRegime,
  TaxRegimeSource,
  BankAccountType,
  BankAccountStatus,
  PixKeyType,
} from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEMO_CNPJ = '48219700000155';

const { ASSET, COST, EXPENSE } = ChartAccountKind;

type ModelAccount = [code: string, name: string, kind: ChartAccountKind];

const MODEL_ACCOUNTS: ModelAccount[] = [
  ['1', 'Ativo', ASSET],
  ['1.2', 'Ativo não circulante', ASSET],
  ['1.2.3', 'Imobilizado', ASSET],
  ['1.2.3.01', 'Computadores e periféricos', ASSET],
  ['1.2.3.02', 'Móveis e utensílios', ASSET],
  ['1.2.3.03', 'Máquinas e equipamentos', ASSET],
  ['1.2.4', 'Intangível', ASSET],
  ['1.2.4.01', 'Softwares com licença perpétua', ASSET],
  ['3', 'Custos', COST],
  ['3.1', 'Custos operacionais', COST],
  ['3.1.01', 'Insumos e matéria-prima', COST],
  ['3.1.02', 'Fretes e logística', COST],
  ['3.1.03', 'Serviços terceirizados na operação', COST],
  ['4', 'Despesas', EXPENSE],
  ['4.1', 'Despesas administrativas', EXPENSE],
  ['4.1.01', 'Softwares e assinaturas', EXPENSE],
  ['4.1.02', 'Serviços de terceiros', EXPENSE],
  ['4.1.03', 'Material de escritório e consumo', EXPENSE],
  ['4.1.04', 'Viagens e hospedagem', EXPENSE],
  ['4.1.05', 'Manutenção e conservação', EXPENSE],
  ['4.1.06', 'Telefonia e internet', EXPENSE],
  ['4.1.07', 'Honorários contábeis e jurídicos', EXPENSE],
  ['4.1.08', 'Hospedagem e infraestrutura de TI', EXPENSE],
  ['4.2', 'Despesas comerciais', EXPENSE],
  ['4.2.01', 'Marketing e publicidade', EXPENSE],
  ['4.2.02', 'Eventos e brindes', EXPENSE],
];

const CATEGORY_ACCOUNTS: Record<string, string> = {
  Software: '4.1.01',
  Serviços: '4.1.02',
  Materiais: '4.1.03',
  Equipamentos: '1.2.3.01',
  Viagens: '4.1.04',
  Marketing: '4.2.01',
  Infraestrutura: '4.1.08',
};

function parentCodeOf(code: string): string | null {
  const separator = code.lastIndexOf('.');
  return separator === -1 ? null : code.slice(0, separator);
}

async function ensureChartOfAccounts(companyId: string): Promise<Map<string, string>> {
  const existing = await prisma.chartAccount.findMany({
    where: { company_id: companyId },
  });

  const codeToId = new Map(existing.map((account) => [account.code, account.id]));

  if (codeToId.size > 0) {
    console.log(`Plano de contas já existe (${codeToId.size} contas), pulando criação.`);
  } else {
    for (const [code, name, kind] of MODEL_ACCOUNTS) {
      const parentCode = parentCodeOf(code);
      const parentId = parentCode ? codeToId.get(parentCode) : null;
      const postable = !MODEL_ACCOUNTS.some(([other]) => parentCodeOf(other) === code);

      const account = await prisma.chartAccount.create({
        data: {
          company_id: companyId,
          parent_id: parentId ?? null,
          code,
          name,
          kind,
          postable,
        },
      });

      codeToId.set(code, account.id);
    }

    console.log(`Plano de contas modelo criado: ${MODEL_ACCOUNTS.length} contas.`);
  }

  for (const [categoryName, code] of Object.entries(CATEGORY_ACCOUNTS)) {
    const accountId = codeToId.get(code);
    if (!accountId) continue;

    const result = await prisma.category.updateMany({
      where: { company_id: companyId, name: categoryName, default_account_id: null },
      data: { default_account_id: accountId },
    });

    if (result.count > 0) {
      console.log(`Categoria ${categoryName} ligada à conta ${code}.`);
    }
  }

  return codeToId;
}

async function ensureSupplierFiscalData(companyId: string): Promise<void> {
  const bySupplier: {
    legalName: string;
    data: Parameters<typeof prisma.supplier.update>[0]['data'];
  }[] = [
    {
      legalName: 'Arbor Consultoria Tributária LTDA',
      data: {
        opened_on: new Date('2011-03-14'),
        legal_nature: 'Sociedade Simples Limitada',
        company_size: 'DEMAIS',
        share_capital_cents: 15000000n,
        main_activity_code: '692000',
        main_activity_description: 'Atividades de consultoria em gestão empresarial',
        simples_opted: false,
        mei_opted: false,
        tax_regime: TaxRegime.LUCRO_PRESUMIDO,
        tax_regime_source: TaxRegimeSource.RECEITA,
        state_registration: '107.234.567.118',
        partners: [
          { name: 'CARLA REGINA ARBOR MONTEIRO', role: 'Sócia-administradora', enteredAt: '2011-03-14' },
          { name: 'FÁBIO HENRIQUE ARBOR', role: 'Sócio', enteredAt: '2011-03-14' },
        ],
      },
    },
    {
      legalName: 'Prime TI Serviços e Licenciamento LTDA',
      data: {
        opened_on: new Date('2018-07-02'),
        legal_nature: 'Sociedade Empresária Limitada',
        company_size: 'ME',
        share_capital_cents: 5000000n,
        main_activity_code: '620100',
        main_activity_description: 'Desenvolvimento de programas de computador sob encomenda',
        simples_opted: true,
        mei_opted: false,
        tax_regime: TaxRegime.SIMPLES_NACIONAL,
        tax_regime_source: TaxRegimeSource.RECEITA,
        state_registration: null,
        partners: [
          { name: 'RENAN PRIME SOUZA', role: 'Sócio-administrador', enteredAt: '2018-07-02' },
        ],
      },
    },
    {
      legalName: 'Delta Equipamentos Industriais EIRELI',
      data: {
        opened_on: new Date('2005-11-20'),
        legal_nature: 'Empresa Individual de Responsabilidade Limitada',
        company_size: 'DEMAIS',
        share_capital_cents: 80000000n,
        main_activity_code: '282100',
        main_activity_description: 'Fabricação de máquinas e equipamentos para uso industrial',
        simples_opted: false,
        mei_opted: false,
        tax_regime: TaxRegime.LUCRO_REAL,
        tax_regime_source: TaxRegimeSource.MANUAL,
        state_registration: '890.112.334.220',
        partners: [
          { name: 'MARCELO DELTA FIGUEIREDO', role: 'Titular', enteredAt: '2005-11-20' },
        ],
      },
    },
  ];

  for (const { legalName, data } of bySupplier) {
    const supplier = await prisma.supplier.findFirst({
      where: { company_id: companyId, legal_name: legalName },
    });

    if (!supplier) {
      console.log(`Fornecedor ${legalName} não encontrado, pulando.`);
      continue;
    }

    if (supplier.legal_nature) {
      console.log(`${legalName} já tem dados fiscais, pulando.`);
      continue;
    }

    await prisma.supplier.update({ where: { id: supplier.id }, data });
    console.log(`Dados fiscais aplicados a ${legalName}.`);
  }
}

async function ensureBankAccounts(companyId: string): Promise<void> {
  const memberByEmail = async (email: string) =>
    prisma.companyMember.findFirstOrThrow({
      where: { company_id: companyId, user: { email } },
    });

  const ana = await memberByEmail('ana.lima@nortis.demo');
  const caio = await memberByEmail('caio.freitas@nortis.demo');

  const arbor = await prisma.supplier.findFirst({
    where: { company_id: companyId, legal_name: 'Arbor Consultoria Tributária LTDA' },
  });
  const primeTi = await prisma.supplier.findFirst({
    where: { company_id: companyId, legal_name: 'Prime TI Serviços e Licenciamento LTDA' },
  });
  const norteLogistica = await prisma.supplier.findFirst({
    where: { company_id: companyId, legal_name: 'Norte Logística e Transportes S/A' },
  });

  const existing = await prisma.supplierBankAccount.count({ where: { company_id: companyId } });
  if (existing > 0) {
    console.log(`Já existem ${existing} contas bancárias, pulando criação.`);
    return;
  }

  if (arbor) {
    await prisma.supplierBankAccount.create({
      data: {
        company_id: companyId,
        supplier_id: arbor.id,
        bank_code: '341',
        branch: '4521',
        account_number: '00087654',
        account_digit: '3',
        account_type: BankAccountType.CHECKING,
        holder_name: arbor.legal_name,
        holder_document: arbor.cnpj,
        pix_key_type: PixKeyType.CNPJ,
        pix_key: arbor.cnpj,
        third_party: false,
        status: BankAccountStatus.APPROVED,
        requested_by_id: ana.id,
        reviewed_by_id: caio.id,
        reviewed_at: new Date(),
        review_note: 'Confirmado com a Arbor por telefone.',
      },
    });
    console.log('Conta bancária aprovada criada para Arbor Consultoria Tributária.');
  }

  if (primeTi) {
    await prisma.supplierBankAccount.create({
      data: {
        company_id: companyId,
        supplier_id: primeTi.id,
        bank_code: '077',
        branch: '0001',
        account_number: '00123456',
        account_digit: '9',
        account_type: BankAccountType.PAYMENT,
        holder_name: primeTi.legal_name,
        holder_document: primeTi.cnpj,
        pix_key_type: PixKeyType.EMAIL,
        pix_key: 'financeiro@primeti.com.br',
        third_party: false,
        status: BankAccountStatus.PENDING,
        requested_by_id: ana.id,
      },
    });
    console.log('Conta bancária pendente criada para Prime TI (aguardando aprovação).');
  }

  if (norteLogistica) {
    await prisma.supplierBankAccount.create({
      data: {
        company_id: companyId,
        supplier_id: norteLogistica.id,
        bank_code: '104',
        branch: '2233',
        account_number: '00045678',
        account_digit: '1',
        account_type: BankAccountType.CHECKING,
        holder_name: 'Fatoração Norte Capital LTDA',
        holder_document: '38221004000190',
        pix_key_type: null,
        pix_key: null,
        third_party: true,
        justification:
          'Norte Logística cedeu os recebíveis para a factoring Norte Capital; pagamento vai direto para ela.',
        status: BankAccountStatus.PENDING,
        requested_by_id: ana.id,
      },
    });
    console.log('Conta bancária de terceiro (factoring) criada para Norte Logística.');
  }
}

async function ensureRequestAllocations(
  companyId: string,
  codeToId: Map<string, string>,
): Promise<void> {
  const targets: { number: string; lines: { costCenterName: string; code: string; shareBps: number }[] }[] = [
    {
      number: 'REQ-2026-0024',
      lines: [
        { costCenterName: 'Facilities', code: '1.2.3.01', shareBps: 6000 },
        { costCenterName: 'Marketing', code: '4.2.01', shareBps: 4000 },
      ],
    },
    {
      number: 'REQ-2026-0006',
      lines: [
        { costCenterName: 'Tecnologia', code: '4.1.08', shareBps: 6500 },
        { costCenterName: 'Marketing', code: '4.2.01', shareBps: 3500 },
      ],
    },
  ];

  for (const target of targets) {
    const request = await prisma.purchaseRequest.findFirst({
      where: { company_id: companyId, number: target.number },
    });

    if (!request) {
      console.log(`Pedido ${target.number} não encontrado, pulando rateio.`);
      continue;
    }

    const already = await prisma.requestAllocation.count({
      where: { purchase_request_id: request.id },
    });

    if (already > 0) {
      console.log(`Pedido ${target.number} já tem rateio, pulando.`);
      continue;
    }

    const costCenters = await prisma.costCenter.findMany({
      where: {
        company_id: companyId,
        name: { in: target.lines.map((line) => line.costCenterName) },
      },
    });
    const costCenterIdByName = new Map(costCenters.map((cc) => [cc.name, cc.id]));

    for (const line of target.lines) {
      const costCenterId = costCenterIdByName.get(line.costCenterName);
      const chartAccountId = codeToId.get(line.code);
      if (!costCenterId || !chartAccountId) continue;

      await prisma.requestAllocation.create({
        data: {
          purchase_request_id: request.id,
          cost_center_id: costCenterId,
          chart_account_id: chartAccountId,
          share_bps: line.shareBps,
        },
      });
    }

    console.log(`Rateio criado para ${target.number}.`);
  }
}

async function ensurePayableAllocation(
  companyId: string,
  codeToId: Map<string, string>,
): Promise<void> {
  const vetor = await prisma.supplier.findFirst({
    where: { company_id: companyId, legal_name: 'Vetor Comunicação e Mídia LTDA' },
  });
  if (!vetor) return;

  const payable = await prisma.payable.findFirst({
    where: { company_id: companyId, supplier_id: vetor.id },
  });
  if (!payable) return;

  const already = await prisma.payableAllocation.count({ where: { payable_id: payable.id } });
  if (already > 0) {
    console.log('Conta a pagar da Vetor já tem rateio, pulando.');
    return;
  }

  const costCenters = await prisma.costCenter.findMany({
    where: { company_id: companyId, name: { in: ['Marketing', 'Operações'] } },
  });
  const marketing = costCenters.find((cc) => cc.name === 'Marketing');
  const operacoes = costCenters.find((cc) => cc.name === 'Operações');
  const marketingAccount = codeToId.get('4.2.01');
  if (!marketing || !operacoes || !marketingAccount) return;

  const total = payable.amount_cents;
  const marketingAmount = (total * 70n) / 100n;
  const operacoesAmount = total - marketingAmount;

  await prisma.payableAllocation.createMany({
    data: [
      {
        payable_id: payable.id,
        cost_center_id: marketing.id,
        chart_account_id: marketingAccount,
        amount_cents: marketingAmount,
      },
      {
        payable_id: payable.id,
        cost_center_id: operacoes.id,
        chart_account_id: null,
        amount_cents: operacoesAmount,
      },
    ],
  });

  console.log('Rateio criado para a conta a pagar da Vetor Comunicação.');
}

async function main() {
  const company = await prisma.company.findUniqueOrThrow({
    where: { cnpj: DEMO_CNPJ },
  });

  console.log(`Semeando base contábil para ${company.legal_name}...`);

  const codeToId = await ensureChartOfAccounts(company.id);
  await ensureSupplierFiscalData(company.id);
  await ensureBankAccounts(company.id);
  await ensureRequestAllocations(company.id, codeToId);
  await ensurePayableAllocation(company.id, codeToId);

  console.log('Concluído.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
