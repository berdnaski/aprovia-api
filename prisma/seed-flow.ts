import 'dotenv/config';

const API = process.env.SEED_API_URL ?? 'http://localhost:3000/api';
const PASSWORD = 'Demo@2026';

type Session = { cookie: string; name: string };

async function login(email: string): Promise<Session> {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });

  if (!response.ok) {
    throw new Error(`login ${email}: ${response.status} ${await response.text()}`);
  }

  const cookie = (response.headers.getSetCookie?.() ?? [])
    .map((raw) => raw.split(';')[0])
    .join('; ');

  const body = (await response.json()) as { user: { name: string } };
  return { cookie, name: body.user.name };
}

async function call<T>(
  session: Session,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Cookie: session.cookie,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status} ${text.slice(0, 300)}`);
  }

  return text ? (JSON.parse(text) as T) : (undefined as T);
}

type Row = { id: string; name?: string; number?: string };

async function findCostCenter(session: Session, name: string): Promise<string> {
  const list = await call<Row[]>(session, 'GET', '/cost-centers');
  const found = list.find((item) => item.name === name);

  if (!found) {
    throw new Error(`centro de custo ${name} não encontrado para ${session.name}`);
  }

  return found.id;
}

async function findSupplier(session: Session, fragment: string): Promise<string> {
  const page = await call<{ items: { id: string; legalName: string }[] }>(
    session,
    'GET',
    '/suppliers?perPage=100',
  );
  const found = page.items.find((item) => item.legalName.includes(fragment));

  if (!found) {
    throw new Error(`fornecedor ${fragment} não encontrado`);
  }

  return found.id;
}

async function findCategory(session: Session, name: string): Promise<string> {
  const list = await call<Row[]>(session, 'GET', '/categories');
  const found = list.find((item) => item.name === name);

  if (!found) {
    throw new Error(`categoria ${name} não encontrada`);
  }

  return found.id;
}

interface FlowItem {
  description: string;
  quantity: string;
  unit: string;
  unitPriceCents: string;
}

interface FlowSpec {
  requester: 'marina' | 'bruno';
  title: string;
  description: string;
  costCenter: string;
  category: string;
  supplier: string;
  paymentTerms: string;
  items: FlowItem[];
  stopAt: 'PENDING' | 'APPROVED' | 'ORDER_SENT' | 'RECEIVED';
}

const FLOWS: FlowSpec[] = [
  {
    requester: 'marina',
    title: 'Notebooks para o time de engenharia',
    description:
      'Substituição de 6 estações de trabalho fora de garantia. As máquinas atuais travam nas ferramentas de build e já causaram parada de time.',
    costCenter: 'Tecnologia',
    category: 'Equipamentos',
    supplier: 'Tech Distribuidora',
    paymentTerms: '30 dias após a entrega',
    items: [
      {
        description: 'Notebook 14" i5 16GB 512GB',
        quantity: '6',
        unit: 'un',
        unitPriceCents: '429000',
      },
      {
        description: 'Dock station USB-C',
        quantity: '6',
        unit: 'un',
        unitPriceCents: '89000',
      },
    ],
    stopAt: 'PENDING',
  },
  {
    requester: 'bruno',
    title: 'Cadeiras ergonômicas para o escritório',
    description:
      'Troca das cadeiras da sala de operações após laudo ergonômico. Vinte postos hoje sem regulagem de altura.',
    costCenter: 'Facilities',
    category: 'Equipamentos',
    supplier: 'Móveis Sul',
    paymentTerms: '28 dias',
    items: [
      {
        description: 'Cadeira ergonômica com apoio lombar',
        quantity: '20',
        unit: 'un',
        unitPriceCents: '119000',
      },
    ],
    stopAt: 'APPROVED',
  },
  {
    requester: 'marina',
    title: 'Servidores de borda para a obra',
    description:
      'Dois servidores compactos para a frente de obra da BR-101, onde a conexão cai e o time perde apontamento de campo.',
    costCenter: 'Tecnologia',
    category: 'Equipamentos',
    supplier: 'Tech Distribuidora',
    paymentTerms: '45 dias',
    items: [
      {
        description: 'Servidor de borda 32GB RAM',
        quantity: '2',
        unit: 'un',
        unitPriceCents: '1450000',
      },
    ],
    stopAt: 'ORDER_SENT',
  },
  {
    requester: 'bruno',
    title: 'Mobiliário da recepção',
    description:
      'Recomposição do mobiliário da recepção da sede após a reforma do piso térreo.',
    costCenter: 'Facilities',
    category: 'Equipamentos',
    supplier: 'Móveis Sul',
    paymentTerms: '30 dias',
    items: [
      {
        description: 'Balcão de atendimento',
        quantity: '1',
        unit: 'un',
        unitPriceCents: '580000',
      },
      {
        description: 'Poltrona de espera',
        quantity: '4',
        unit: 'un',
        unitPriceCents: '95000',
      },
    ],
    stopAt: 'RECEIVED',
  },
];

async function approveFully(requestId: string, sessions: Session[]): Promise<void> {
  for (let round = 0; round < 6; round += 1) {
    let decided = false;

    for (const session of sessions) {
      const pending = await call<{ items: { id: string }[] }>(
        session,
        'GET',
        '/purchase-requests?view=PENDING_FOR_ME&perPage=50',
      );

      if (!pending.items.some((item) => item.id === requestId)) {
        continue;
      }

      await call(session, 'POST', `/purchase-requests/${requestId}/decisions`, {
        type: 'APPROVED',
      });
      console.log(`    aprovado por ${session.name}`);
      decided = true;
    }

    if (!decided) {
      return;
    }
  }
}

async function main(): Promise<void> {
  const marina = await login('marina.rocha@nortis.demo');
  const caio = await login('caio.freitas@nortis.demo');
  const rita = await login('rita.nogueira@nortis.demo');
  const bruno = await login('bruno.souza@nortis.demo');
  const ana = await login('ana.lima@nortis.demo');
  const requesters = { marina, bruno };

  const approvers = [caio, rita, ana];
  const supplierIds = new Map<string, string>();

  for (const spec of FLOWS) {
    console.log(`\n${spec.title}`);

    const author = requesters[spec.requester];
    const costCenterId = await findCostCenter(author, spec.costCenter);
    const categoryId = await findCategory(author, spec.category);

    if (!supplierIds.has(spec.supplier)) {
      supplierIds.set(spec.supplier, await findSupplier(author, spec.supplier));
    }

    const draft = await call<{ id: string; number: string }>(
      author,
      'POST',
      '/purchase-requests',
      { title: spec.title, costCenterId },
    );

    await call(author, 'PATCH', `/purchase-requests/${draft.id}`, {
      title: spec.title,
      description: spec.description,
      categoryId,
      supplierId: supplierIds.get(spec.supplier),
      paymentTerms: spec.paymentTerms,
      urgency: 'MEDIUM',
    });

    for (const item of spec.items) {
      await call(author, 'POST', `/purchase-requests/${draft.id}/items`, item);
    }

    await call(author, 'POST', `/purchase-requests/${draft.id}/submit`, {
      confirmDuplicate: true,
    });
    console.log(`    ${draft.number} enviado por ${author.name}`);

    if (spec.stopAt === 'PENDING') {
      continue;
    }

    await approveFully(draft.id, approvers);

    if (spec.stopAt === 'APPROVED') {
      continue;
    }

    const order = await call<{ id: string; number: string }>(
      ana,
      'POST',
      `/purchase-requests/${draft.id}/purchase-order`,
      { paymentTerms: spec.paymentTerms },
    );
    console.log(`    ordem ${order.number} emitida`);

    await call(ana, 'POST', `/purchase-orders/${order.id}/send`, {});
    console.log('    ordem enviada ao fornecedor');

    if (spec.stopAt === 'ORDER_SENT') {
      continue;
    }

    const full = await call<{
      items: { id: string; quantity: string }[];
    }>(ana, 'GET', `/purchase-orders/${order.id}`);

    const receipt = await call<{ id: string; status: string }>(
      ana,
      'POST',
      `/purchase-orders/${order.id}/receipts`,
      {
        items: full.items.map((item) => ({
          purchaseOrderItemId: item.id,
          quantity: item.quantity,
        })),
      },
    );
    console.log(`    recebimento registrado (${receipt.status})`);
  }

  console.log('\nResumo por perfil:');
  for (const session of [marina, bruno, caio, ana]) {
    const mine = await call<{ meta: { total: number } }>(
      session,
      'GET',
      '/purchase-requests?view=MINE&perPage=1',
    );
    const pending = await call<{ meta: { total: number } }>(
      session,
      'GET',
      '/purchase-requests?view=PENDING_FOR_ME&perPage=1',
    );
    console.log(
      `  ${session.name}: ${mine.meta.total} pedido(s) próprio(s), ${pending.meta.total} aguardando decisão`,
    );
  }
}

main().catch((error: unknown) => {
  console.error('Falha:', (error as Error).message);
  process.exit(1);
});
