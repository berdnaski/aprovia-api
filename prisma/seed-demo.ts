import 'dotenv/config';
import { hash } from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  CompanyMemberRole,
  RequestStatus,
  StepStatus,
  DecisionType,
  ApproverType,
  RegistrationStatus,
  ValidationStatus,
} from '../generated/prisma/client';
import { DEFAULT_CATEGORIES } from '../src/shared/constants/default-categories';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEMO_CNPJ = '48219700000155';
const DEMO_PASSWORD = 'Demo@2026';

const PEOPLE_SEED = [
  { key: 'ana', name: 'Ana Lima', email: 'ana.lima@nortis.demo' },
  { key: 'caio', name: 'Caio Freitas', email: 'caio.freitas@nortis.demo' },
  { key: 'rita', name: 'Rita Nogueira', email: 'rita.nogueira@nortis.demo' },
  { key: 'marina', name: 'Marina Rocha', email: 'marina.rocha@nortis.demo' },
  { key: 'bruno', name: 'Bruno Souza', email: 'bruno.souza@nortis.demo' },
  { key: 'julia', name: 'Júlia Martins', email: 'julia.martins@nortis.demo' },
] as const;

function cents(reais: number): bigint {
  return BigInt(Math.round(reais * 100));
}

function monthRange(offset = 0): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 0));
  return { start, end };
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function alreadySeeded(): Promise<boolean> {
  const existing = await prisma.company.findUnique({ where: { cnpj: DEMO_CNPJ } });
  if (!existing) return false;

  console.log(`A empresa demo já existe (criada em ${existing.created_at.toLocaleString('pt-BR')}).`);
  console.log('Não apago nada — audit_logs é append-only no banco, de propósito.');
  console.log('Pra recomeçar do zero: npm run db:reset && npm run seed:demo\n');
  printLogins();
  return true;
}

function printLogins(): void {
  console.log(`Login de qualquer pessoa: <e-mail> / ${DEMO_PASSWORD}`);
  for (const person of PEOPLE_SEED) {
    console.log(`  ${person.email}`);
  }
}

async function main(): Promise<void> {
  console.log('Semeando empresa de demonstração...\n');

  if (await alreadySeeded()) return;

  const passwordHash = await hash(DEMO_PASSWORD, 12);

  const plan = await prisma.plan.findUnique({
    where: { tier: 'ENTERPRISE' },
  });
  if (!plan) {
    throw new Error(
      'Plano ENTERPRISE não encontrado. Rode o seed de planos da plataforma primeiro.',
    );
  }
  const company = await prisma.company.create({
    data: {
      legal_name: 'Nortis Engenharia e Serviços LTDA',
      trade_name: 'Nortis Engenharia',
      cnpj: DEMO_CNPJ,
      industry: 'Engenharia e construção',
      company_size: '51-200',
      onboarding_step: 'DONE',
      onboarding_completed_at: daysAgo(60),
      dual_approval_threshold_cents: cents(50_000),
    },
  });

  await prisma.subscription.create({
    data: {
      company_id: company.id,
      plan_id: plan.id,
      status: 'ACTIVE',
      period_start: daysAgo(60),
    },
  });
  const users: Record<string, { id: string }> = {};
  for (const person of PEOPLE_SEED) {
    users[person.key] = await prisma.user.create({
      data: {
        name: person.name,
        email: person.email,
        password_hash: passwordHash,
        email_verified: true,
        terms_accepted_at: daysAgo(60),
      },
    });
  }

  const ana = await prisma.companyMember.create({
    data: {
      user_id: users.ana.id,
      company_id: company.id,
      role: CompanyMemberRole.FINANCE_ADMIN,
      approval_limit_cents: cents(9_999_999),
    },
  });

  const caio = await prisma.companyMember.create({
    data: {
      user_id: users.caio.id,
      company_id: company.id,
      role: CompanyMemberRole.APPROVER,
      manager_id: ana.id,
      approval_limit_cents: cents(5_000),
    },
  });

  const rita = await prisma.companyMember.create({
    data: {
      user_id: users.rita.id,
      company_id: company.id,
      role: CompanyMemberRole.APPROVER,
      manager_id: ana.id,
      approval_limit_cents: cents(5_000),
    },
  });

  const marina = await prisma.companyMember.create({
    data: {
      user_id: users.marina.id,
      company_id: company.id,
      role: CompanyMemberRole.REQUESTER,
      manager_id: caio.id,
      approval_limit_cents: cents(0),
    },
  });

  const bruno = await prisma.companyMember.create({
    data: {
      user_id: users.bruno.id,
      company_id: company.id,
      role: CompanyMemberRole.REQUESTER,
      manager_id: rita.id,
      approval_limit_cents: cents(0),
    },
  });

  const julia = await prisma.companyMember.create({
    data: {
      user_id: users.julia.id,
      company_id: company.id,
      role: CompanyMemberRole.REQUESTER,
      manager_id: caio.id,
      approval_limit_cents: cents(0),
    },
  });
  const { start: periodStart, end: periodEnd } = monthRange();

  const costCenterSeed = [
    { name: 'Tecnologia', manager: caio, cap: 180_000 },
    { name: 'Operações', manager: ana, cap: 240_000 },
    { name: 'Marketing', manager: rita, cap: 90_000 },
    { name: 'Facilities', manager: ana, cap: 130_000 },
  ];

  const costCenters: Record<string, { id: string; budgetId: string }> = {};
  for (const cc of costCenterSeed) {
    const created = await prisma.costCenter.create({
      data: {
        company_id: company.id,
        name: cc.name,
        manager_id: cc.manager.id,
      },
    });
    const budget = await prisma.budget.create({
      data: {
        cost_center_id: created.id,
        period_start: periodStart,
        period_end: periodEnd,
        total_amount_cents: cents(cc.cap),
      },
    });
    costCenters[cc.name] = { id: created.id, budgetId: budget.id };
  }

  const costCenterMemberships: Array<[string, { id: string }]> = [
    ['Tecnologia', ana],
    ['Tecnologia', caio],
    ['Tecnologia', marina],
    ['Tecnologia', julia],
    ['Operações', ana],
    ['Operações', caio],
    ['Operações', julia],
    ['Marketing', ana],
    ['Marketing', rita],
    ['Facilities', ana],
    ['Facilities', rita],
    ['Facilities', bruno],
  ];
  await prisma.costCenterMember.createMany({
    data: costCenterMemberships.map(([ccName, member]) => ({
      cost_center_id: costCenters[ccName].id,
      member_id: member.id,
    })),
  });

  await prisma.companyMember.update({
    where: { id: marina.id },
    data: { default_cost_center_id: costCenters['Tecnologia'].id },
  });
  await prisma.companyMember.update({
    where: { id: bruno.id },
    data: { default_cost_center_id: costCenters['Facilities'].id },
  });
  await prisma.companyMember.update({
    where: { id: julia.id },
    data: { default_cost_center_id: costCenters['Operações'].id },
  });
  await prisma.approvalRule.createMany({
    data: [
      {
        company_id: company.id,
        min_amount_cents: cents(0),
        max_amount_cents: cents(5_000),
        approver_type: ApproverType.COST_CENTER_MANAGER,
      },
      {
        company_id: company.id,
        min_amount_cents: cents(5_000) + 1n,
        max_amount_cents: cents(50_000),
        approver_type: ApproverType.DIRECT_MANAGER,
      },
      {
        company_id: company.id,
        min_amount_cents: cents(50_000) + 1n,
        max_amount_cents: null,
        approver_type: ApproverType.DIRECT_MANAGER,
        requires_dual_approval: true,
      },
    ],
  });
  const categoryRows = await prisma.category.createManyAndReturn({
    data: DEFAULT_CATEGORIES.map((c) => ({
      company_id: company.id,
      name: c.name,
      description: c.description,
    })),
  });
  const categories = Object.fromEntries(categoryRows.map((c) => [c.name, c]));
  const techDistribuidora = await prisma.supplier.create({
    data: {
      company_id: company.id,
      cnpj: '18442900000107',
      legal_name: 'Tech Distribuidora LTDA',
      trade_name: 'Tech Distribuidora',
      registration_status: RegistrationStatus.ACTIVE,
      validation_status: ValidationStatus.VALIDATED,
      validated_at: daysAgo(3),
      city: 'São Paulo',
      state: 'SP',
    },
  });

  await prisma.supplier.create({
    data: {
      company_id: company.id,
      cnpj: '09311766000152',
      legal_name: 'Móveis Sul Comércio LTDA',
      trade_name: 'Móveis Sul',
      registration_status: RegistrationStatus.ACTIVE,
      validation_status: ValidationStatus.VALIDATED,
      validated_at: daysAgo(20),
      city: 'Curitiba',
      state: 'PR',
    },
  });

  await prisma.supplier.create({
    data: {
      company_id: company.id,
      cnpj: '27880145000131',
      legal_name: 'Alfa Serviços ME',
      trade_name: 'Alfa Serviços',
      registration_status: RegistrationStatus.SUSPENDED,
      validation_status: ValidationStatus.VALIDATED,
      validated_at: daysAgo(1),
      blocked: true,
      city: 'Belo Horizonte',
      state: 'MG',
    },
  });
  type HistoricalRequest = {
    number: string;
    title: string;
    requester: { id: string; user_id: string };
    approver: { id: string; user_id: string };
    costCenter: string;
    category: string;
    supplierId?: string;
    amount: number;
    status: RequestStatus;
    decision: DecisionType;
    justification?: string;
    createdDaysAgo: number;
  };

  const history: HistoricalRequest[] = [
    {
      number: 'REQ-1038',
      title: 'Manutenção da frota',
      requester: julia,
      approver: caio,
      costCenter: 'Operações',
      category: 'Serviços',
      amount: 7_940,
      status: RequestStatus.APPROVED,
      decision: DecisionType.APPROVED,
      createdDaysAgo: 9,
    },
    {
      number: 'REQ-1039',
      title: 'Material de escritório',
      requester: bruno,
      approver: rita,
      costCenter: 'Facilities',
      category: 'Materiais',
      amount: 1_180.4,
      status: RequestStatus.COMPLETED,
      decision: DecisionType.APPROVED,
      createdDaysAgo: 14,
    },
    {
      number: 'REQ-1040',
      title: 'Reforma do galpão',
      requester: rita,
      approver: ana,
      costCenter: 'Facilities',
      category: 'Serviços',
      amount: 92_500,
      status: RequestStatus.APPROVED,
      decision: DecisionType.APPROVED,
      createdDaysAgo: 6,
    },
    {
      number: 'REQ-1041',
      title: 'Licenças de software',
      requester: caio,
      approver: ana,
      costCenter: 'Tecnologia',
      category: 'Software',
      supplierId: techDistribuidora.id,
      amount: 4_320,
      status: RequestStatus.APPROVED,
      decision: DecisionType.APPROVED,
      createdDaysAgo: 4,
    },
    {
      number: 'REQ-1037',
      title: 'Assinatura de ferramenta duplicada',
      requester: marina,
      approver: caio,
      costCenter: 'Tecnologia',
      category: 'Software',
      amount: 650,
      status: RequestStatus.REJECTED,
      decision: DecisionType.REJECTED,
      justification: 'Já temos uma ferramenta equivalente contratada nesse centro de custo.',
      createdDaysAgo: 11,
    },
  ];

  for (const item of history) {
    const totalCents = cents(item.amount);
    const createdAt = daysAgo(item.createdDaysAgo);
    const submittedAt = new Date(createdAt.getTime() + 60 * 60 * 1000);
    const decidedAt = new Date(submittedAt.getTime() + 3 * 60 * 60 * 1000);

    const request = await prisma.purchaseRequest.create({
      data: {
        number: item.number,
        company_id: company.id,
        requester_id: item.requester.id,
        cost_center_id: costCenters[item.costCenter].id,
        category_id: categories[item.category]?.id,
        supplier_id: item.supplierId,
        title: item.title,
        total_amount_cents: totalCents,
        status: item.status,
        created_at: createdAt,
        submitted_at: submittedAt,
        finalized_at: decidedAt,
      },
    });

    await prisma.requestItem.create({
      data: {
        purchase_request_id: request.id,
        description: item.title,
        quantity: 1,
        unit: 'un',
        unit_price_cents: totalCents,
        total_cents: totalCents,
      },
    });

    const step = await prisma.approvalStep.create({
      data: {
        purchase_request_id: request.id,
        expected_approver_id: item.approver.id,
        step_order: 1,
        status:
          item.decision === DecisionType.APPROVED
            ? StepStatus.APPROVED
            : StepStatus.REJECTED,
        started_at: submittedAt,
        ended_at: decidedAt,
      },
    });

    await prisma.decision.create({
      data: {
        approval_step_id: step.id,
        decider_id: item.approver.id,
        type: item.decision,
        justification: item.justification,
        budget_at_time_cents: cents(
          costCenterSeed.find((c) => c.name === item.costCenter)!.cap,
        ),
        committed_at_time_cents: 0n,
        available_at_time_cents: cents(
          costCenterSeed.find((c) => c.name === item.costCenter)!.cap,
        ),
        decided_at: decidedAt,
      },
    });

    if (item.decision === DecisionType.APPROVED) {
      await prisma.budgetEntry.create({
        data: {
          budget_id: costCenters[item.costCenter].budgetId,
          purchase_request_id: request.id,
          type: 'CONSUMPTION',
          amount_cents: totalCents,
          occurred_at: decidedAt,
        },
      });
    }

    await prisma.auditLog.createMany({
      data: [
        {
          company_id: company.id,
          actor_id: item.requester.user_id,
          event_type: 'CREATED',
          entity_type: 'PurchaseRequest',
          entity_id: request.id,
          new_data: { title: item.title, totalAmountCents: totalCents.toString() },
          occurred_at: createdAt,
        },
        {
          company_id: company.id,
          actor_id: item.requester.user_id,
          event_type: 'SUBMITTED',
          entity_type: 'PurchaseRequest',
          entity_id: request.id,
          occurred_at: submittedAt,
        },
        {
          company_id: company.id,
          actor_id: item.approver.user_id,
          event_type: item.decision === DecisionType.APPROVED ? 'APPROVED' : 'REJECTED',
          entity_type: 'PurchaseRequest',
          entity_id: request.id,
          new_data: item.justification ? { justification: item.justification } : undefined,
          occurred_at: decidedAt,
        },
      ],
    });
  }

  console.log('\nEmpresa demo pronta:');
  console.log(`  ${company.legal_name} (CNPJ ${DEMO_CNPJ})`);
  console.log(`  Login de qualquer pessoa: <email> / ${DEMO_PASSWORD}`);
  for (const person of PEOPLE_SEED) {
    console.log(`    ${person.email}`);
  }
  console.log(
    '\nAgora crie o pedido #1042 "Notebooks para o time" ao vivo, como Marina Rocha,',
  );
  console.log('anexando um PDF de orçamento da Tech Distribuidora, para mostrar a IA extraindo.');
}

main()
  .catch((error: unknown) => {
    console.error('Falha no seed de demo:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
