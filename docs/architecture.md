# AprovAI — Arquitetura

> Como o código se organiza. Complementa **[requirements.md](./requirements.md)** (o que o sistema faz) e **[data-model.md](./data-model.md)** (onde os dados moram).

Boa parte das decisões já estava fixada nos requisitos não funcionais — RNF18 (Clean Architecture), RNF03 (isolamento por tenant), RNF12 (fila para tarefas longas), RNF15 (roteamento determinístico). Este documento registra o que aqueles requisitos implicam.

| Camada | Escolha |
|---|---|
| Backend | NestJS + TypeScript + Prisma |
| Banco | PostgreSQL |
| Fila | BullMQ sobre Redis |
| Frontend | Vite + React + Tailwind + shadcn/ui |
| Dados no front | TanStack Query |

---

## 1. Containers

```
┌──────────────────────┐
│  Vite + React (SPA)  │
│  build estático      │
└──────────┬───────────┘
           │ HTTPS / JSON · cookie HttpOnly
           ▼
┌───────────────────────────────────┐        ┌──────────────┐
│      API NestJS (1 container)     │───────►│  BrasilAPI   │  CNPJ
│                                   │        ├──────────────┤
│  HTTP controllers                 │───────►│ Provedor LLM │  extração
│  BullMQ worker (in-process)       │        ├──────────────┤
│  @nestjs/schedule (cron)          │───────►│ E-mail / S3  │
└───────┬───────────────────┬───────┘        └──────────────┘
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│  PostgreSQL   │   │     Redis     │
│  dados        │   │     filas     │
└───────────────┘   └───────────────┘
```

**Um único container de aplicação.** HTTP, worker e cron no mesmo processo NestJS. As tarefas do RNF12 continuam fora do ciclo de requisição, que é o que o requisito exige — separar em containers depois é configuração (`PROCESS_ROLE=api|worker|all`), não reescrita.

Gatilhos para separar: P95 do HTTP degradando durante relatório mensal; mais de uma réplica da API (cron duplicaria); extração por IA segurando o pool de conexões.

**Frontend é build estático.** Sem processo Node no front — o Nest já é servidor, autenticação e regras. SSR não se paga: o painel é todo atrás de login (SEO irrelevante) e o cookie `HttpOnly` da RNF06 vai direto do browser à API.

> **Exceção prevista:** a página de aprovação por link (RF65) exige FCP < 1,5s em 4G (RNF10). Se o bundle crescer a ponto de ameaçar isso, ela vira uma entrada separada no Vite (`approval.html`) — não é motivo para adotar SSR no projeto todo.

**Serviços externos podem cair, e cada um tem fallback:** RNF14 (timeout de 3s no CNPJ → cadastro manual), RNF13 (IA falha → formulário manual), RNF12 (e-mail por fila com retry).

**Redis não guarda fonte de verdade.** Prazos de SLA vivem em `approval_steps.reminder_due_at` / `escalation_due_at`, no Postgres — o cron varre a tabela. Perdido o Redis, nada some nem deixa de escalonar.

---

## 2. Estrutura de pastas

Quatro pastas por módulo: `domain`, `application`, `dto`, `infrastructure`.

```
src/
  modules/
    purchase-request/
      domain/           entidades, enums, *.repository.interface.ts,
                        approval-routing.service.ts  ← o motor (seção 4)
      application/      *.use-case.ts + *.spec.ts ao lado
      dto/              entrada (class-validator) e *-response.dto.ts
      infrastructure/   controller, repository (Prisma), module,
                        decorators/, interceptors/, jobs/

    auth/  admin/  users/  companies/  cost-center/  plans/  notifications/

  shared/
    application/ domain/ dto/ constants/ utils/ validators/
    decorators/       current-user, roles, require-feature
    guards/           jwt-auth, roles, active-subscription, feature
    filters/          all-exceptions, database-exception
    infrastructure/   queue (BullMQ), services (storage)
    mail/             application/ (abstração) + infrastructure/ (Resend)

  app.module.ts   main.ts
```

| Elemento | Padrão |
|---|---|
| Caso de uso | `<verbo>-<recurso>.use-case.ts` |
| Interface de repositório | `<recurso>.repository.interface.ts` → `I<Recurso>Repository` |
| Implementação | `<recurso>.repository.ts` → `<Recurso>Repository` |
| Entidade / enum | `<recurso>.entity.ts` / `<recurso>-<assunto>.enum.ts` |
| Teste | `.spec.ts` ao lado do arquivo testado |
| Módulo | singular — `purchase-request/`, `cost-center/` |

**`dto/` é pasta irmã, não fica dentro de `infrastructure/`.** O caso de uso recebe o DTO direto; deixá-lo no topo evita import atravessando camada.

**Casos de uso compõem entre si.** `LoginUseCase` injeta `FindUserByEmailUseCase` e `ValidatePasswordUseCase` de `users/`, nunca o repositório alheio — assim o módulo importado controla o que expõe via `exports`. Funciona para leitura e validação; para **escrita atômica entre módulos**, o caso de uso externo abre a transação e chama os internos dentro dela (seção 3.3).

---

## 3. Clean Architecture no NestJS

### 3.1 Regra de dependência

```
infrastructure ──► application ──► domain ──► (nada)
```

1. **`domain` não importa nada** — nem Prisma, nem Nest, nem outro módulo. Se uma entidade precisa de `@Injectable()`, está no lugar errado.
2. **`application` importa só `domain`** — repositórios pela abstração, no construtor. Nunca `PrismaService`.
3. **`infrastructure` importa os dois** — única camada que conhece framework, banco e HTTP.

Quando `application` precisa do mundo externo (e-mail, CNPJ, fila), declara a **abstração no `domain`** e recebe a implementação injetada.

**Trave no lint.** Em revisão manual essa regra dura duas semanas. `eslint-plugin-boundaries` faz um import de `domain` para `infrastructure` quebrar o CI.

### 3.2 Classe abstrata como token de DI

`@Inject()` é decorator do Nest e o domínio não pode importar Nest. Classe abstrata existe em runtime, então serve de token sem string mágica:

```ts
// domain/purchase-request.repository.interface.ts
export abstract class IPurchaseRequestRepository {
  abstract findById(id: string, companyId: string): Promise<PurchaseRequestEntity | null>;
  abstract save(request: PurchaseRequestEntity): Promise<void>;
}

// infrastructure/purchase-request.module.ts
providers: [
  { provide: IPurchaseRequestRepository, useClass: PurchaseRequestRepository },
  SubmitPurchaseRequestUseCase,
],
exports: [SubmitPurchaseRequestUseCase],   // o que outros módulos podem compor
```

`@Injectable()` no caso de uso é aceitável — é decorator de DI, não vaza infraestrutura. Em **entidade de domínio**, não: entidade não é serviço.

### 3.3 Transações

A RNF17 exige que aprovar seja atômico e idempotente. `prisma.$transaction` não pode aparecer no caso de uso — é Prisma. A saída é uma abstração:

```ts
// shared/domain/unit-of-work.interface.ts
export abstract class IUnitOfWork {
  abstract run<T>(work: () => Promise<T>): Promise<T>;
}
```

```ts
await this.unitOfWork.run(async () => {
  step.approve(decision);
  await this.approvalStepRepository.save(step);

  if (request.allStepsApproved()) {
    request.approve();
    await this.purchaseRequestRepository.save(request);
    await this.budgetEntryRepository.record(BudgetEntryEntity.consumption(request));  // RN17
  }
  await this.auditRepository.record(AuditEventEntity.approved(request, actor));
});

await this.queueService.enqueue(new NotifyDecisionJob(request.id));   // fora da transação
```

A implementação usa `AsyncLocalStorage` para propagar o client transacional até os repositórios — cada um lê `als.getStore() ?? this.prisma`.

**Enfileirar sempre após o commit.** Job publicado dentro da transação pode ser consumido antes dela terminar, e o worker não acha o registro.

### 3.4 Contexto de tenant

A RNF03 exige que **toda** consulta filtre por empresa. Três defesas:

1. **Assinatura obrigatória** — todo método de repositório recebe `companyId`. Esquecer não compila.
2. **Middleware do Prisma** injeta o filtro nas entidades de negócio, e **lança erro** se não houver tenant no contexto. Silenciar significaria consulta sem filtro passando batido.
3. **`AsyncLocalStorage`, nunca `REQUEST`-scoped.** Provider com escopo de request funciona no controller e **quebra no worker e no cron**, onde não existe request — e os jobs de SLA operam sobre dados de tenants. O contexto é alimentado por guard no HTTP e pelo payload do job no worker.

### 3.5 Fronteiras de dados

- **Modelo do Prisma não cruza a fronteira.** Um mapper (`toDomain` / `toPersistence`) converte no repositório. Custa código repetitivo e paga quando uma coluna nova não vaza pra API sem decisão explícita.
- **`BIGINT` vira `bigint`, não `number`** — acima de 2^53 o `number` perde precisão. Todo `_cents` é `bigint` no domínio e vira `string` no JSON (`JSON.stringify` não serializa `bigint`).
- **Validação global** no `main.ts` com `whitelist: true` (RNF04): sem isso, campo extra no body chega num `update` e altera coluna que o usuário não deveria tocar.
- **Erro de domínio vira HTTP num filtro**, não com `throw new BadRequestException` dentro do domínio. É o único lugar que decide a mensagem amigável da RNF20.

### 3.6 Jobs

O job apenas agenda e delega; a regra vive no caso de uso, que também é chamável por HTTP e por teste.

```ts
// modules/purchase-request/infrastructure/jobs/sla-escalation.job.ts
@Cron('0 */15 * * * *')
async run() {
  const overdue = await this.approvalStepRepository.findOverdue(new Date());   // RF67
  for (const step of overdue) {
    await this.escalateStepUseCase.execute({ approvalStepId: step.id });
  }
}
```

- **Idempotência não é opcional** (RNF17): BullMQ garante *at-least-once*, todo handler tolera reexecução.
- **O cron varre o Postgres**, com índice parcial em `approval_steps (status, escalation_due_at) WHERE status = 'WAITING'`.
- **Retry com backoff** nas integrações externas; esgotado, vai pra dead-letter **com alerta** — sem isso, falha silenciosa vira pedido parado.

---

## 4. O motor de roteamento

A parte mais importante do sistema. Mora em `purchase-request/domain/approval-routing.service.ts`: domínio puro, sem Prisma, sem Nest, **sem I/O**.

Recebe dados já carregados, devolve as etapas a criar:

```ts
type RoutingInput = {
  amountCents: bigint;
  requester: MemberEntity;          // com approvalLimitCents e managerId
  costCenter: CostCenterEntity;
  hierarchy: MemberEntity[];        // cadeia já carregada
  rules: ApprovalRuleEntity[];
  dualApprovalThresholdCents: bigint | null;
  financeAdmins: MemberEntity[];    // fallback da RN27
  at: Date;                         // para avaliar ausência (RN29)
};

type RoutingResult = {
  steps: Array<{ stepOrder: number; expectedApproverId: string; requiresDualApproval: boolean }>;
};
```

**Por que sem I/O:** testável sem banco (RN23–RN33 viram testes de tabela — entra cenário, sai rota); determinístico de verdade, sem timeout ou race (RNF15), o que torna a auditoria defensável; e rápido (RNF09, P95 < 300 ms).

| Regra | Comportamento |
|---|---|
| RN23 | Solicitante nunca aprova o próprio pedido — transborda ao superior |
| RN24 | Alçada insuficiente → sobe a cadeia até cobrir o valor integral |
| RN26 | Acima do valor crítico, marca `requiresDualApproval` |
| RN27 | Cadeia esgotada → roteia para Admin Financeiro |
| RN29 | Aprovador ausente na data → substituto assume |
| RN30 | Substituto não pode ser o solicitante, e não subdelega |

**Ciclo na hierarquia.** O data-model já impede autorreferência, mas A→B→C→A passa nessa validação e trava o motor em laço infinito. Guarde os IDs visitados durante a subida e aborte ao repetir.

**A rota é congelada, não recalculada.** As etapas são materializadas em `approval_steps` na submissão e `requires_dual_approval` é copiado da regra vigente — é isso que implementa a RN22. Nunca recalcule a rota para exibir status; leia `approval_steps`. Exceção: RN39, em que devolução e reenvio recalculam do zero.

```
SubmitPurchaseRequestUseCase
  ├─ valida CNPJ do fornecedor            (RN34, RN35)
  ├─ verifica duplicidade                 (RN36)
  ├─ carrega hierarquia + matriz + saldo
  ├─ ApprovalRoutingService.route(...)    ← domínio puro
  ├─ marca requires_override se estourou tolerância  (RN19)
  └─ [transação] DRAFT → PENDING · cria approval_steps · audit_log
     (após commit) enfileira notificação ao 1º aprovador
```

O consumo de saldo **não** está aqui: só na aprovação final (RN17).

---

## 5. Onde mora cada regra

**Constraint de banco** — o que nunca pode ser violado, porque concorrência não quebra o que o banco garante:
RN01 (`users.email` UQ) · RN12 (`cnpj` UQ) · RN13 / RN14 (NOT NULL) · RN16 (UQ `cost_center_id, period_start`) · RN45 (`REVOKE UPDATE, DELETE`) · RN48 (índice parcial)

**Domínio** — regras com lógica, testáveis sem banco:
RN23–RN33 (`ApprovalRoutingService`) · RN17/RN18/RN19 (`BudgetService`) · RN25 e RN38 (entidade `PurchaseRequest`)

**Aplicação** — validação e orquestração:
RN34/RN35 e RN36 (caso de uso de submissão) · RN44 (`@MinLength(10)` + reforço no domínio) · RN43 (`RolesGuard` + filtro no repositório) · RN03 (conta admins antes de inativar)

### Duas armadilhas

**RN03 e RN49 têm corrida.** "Sempre um Admin Financeiro ativo" e "bloquear convite no limite do plano" são leitura seguida de escrita: dois requests simultâneos passam ambos no `SELECT` e os dois gravam. Exige transação com lock, não um `if`.

**RN17 é o ponto mais sensível.** Aprovar deduz saldo e a RNF17 exige idempotência:

- Mesma transação para: última etapa → `APPROVED`, pedido → `APPROVED`, `budget_entries` (`CONSUMPTION`), `audit_log`.
- Chave de idempotência **no banco** — índice parcial único impedindo dois `CONSUMPTION` para o mesmo `purchase_request_id`. Checagem na aplicação tem janela de corrida.

O saldo é derivado de `budget_entries`, então não há campo mutável para dois processos sobrescreverem. Correção se faz com `REVERSAL`, nunca com UPDATE.

---

## 6. Frontend

SPA em Vite + React consumindo a API, com `features/` espelhando os módulos do backend.

- **TanStack Query** para cache e estados de carregamento — a RNF20 exige retorno visual em toda interação.
- **React Hook Form + Zod** nos formulários.
- **shadcn/ui** porque os componentes viram código seu, editável, em vez de tema que se combate.
- **Autorização é do backend** (RNF08). Esconder botão é usabilidade; o guard do Nest é a única barreira real.
- **Mobile-first** nas telas do solicitante (RF53) e na aprovação por link (RF65), conforme RNF19. O painel admin pode assumir desktop.

---

## 7. Ordem de implementação

**O schema nasce completo** — as 21 tabelas na primeira migration ([data-model.md](./data-model.md)). A ordem abaixo é de *implementação dos módulos*, não de criação de tabelas: cada etapa passa a povoar e usar as tabelas que já existem.

| # | Etapa | Tasks | Tabelas em uso | RFs |
|---|---|---|---|---|
| 0 | **Setup** — schema completo, constraints, shared, seeds | 6 | todas (vazias) | — |
| 1 | **Auth + tenant** — login, sessão, guards, perfil, membros | 5 | `users`, `companies`, `company_members`, `tokens` | RF01–RF10, RF18, RF22–RF25 |
| 2 | **Estrutura financeira** — centros de custo, orçamento, matriz | 4 | `cost_centers`, `cost_center_members`, `budgets`, `budget_entries`, `approval_rules` | RF26–RF36, RF69 |
| 3 | **Fornecedores e categorias** — BrasilAPI com timeout e fallback | 2 | `suppliers`, `categories` | RF39–RF43 |
| 4 | **Pedidos em rascunho** — CRUD, anexos, IA, listagens | 5 | `purchase_requests`, `request_items`, `files` | RF45, RF47–RF56 |
| 5 | **Motor de roteamento** — domínio puro + testes. Sem HTTP | 8 | `approval_rules` | RF37, RF60 |
| 6 | **Fluxo de aprovação** — submissão, decisões, consumo de saldo | 4 | `approval_steps`, `decisions` | RF57–RF59, RF61–RF64, RF68 |
| 7 | **Auditoria e notificação** — trilha imutável, e-mail por fila, SLA | 4 | `audit_logs`, `notifications` | RF65–RF67, RF70–RF74, RF79–RF80 |
| 8 | **Convites, planos e onboarding** — equipe, limites, assistente | 4 | `invites`, `plans`, `subscriptions` | RF11–RF17, RF19–RF21, RF81–RF86 |
| 9 | **Relatórios e métricas** — dashboard, exportação, mensal | 3 | consulta as demais | RF75–RF78 |

**45 tasks.** Cada etapa entrega algo demonstrável e as dependências fluem numa direção só. A etapa 5 chega quando hierarquia, alçadas e centros já existem — dá pra testar com dados reais. É a única sem entrega visível.

**Etapa 1 primeiro, sem exceção.** Sem `company_id` no lugar desde o início, a RNF03 vira retrofit — e retrofit de multi-tenant é reescrever todo repositório.

**A matriz de alçadas (RF34–RF36) fica na etapa 2, não na 5.** O motor apenas *lê* a matriz; quem a configura é um CRUD que depende de centros de custo existirem. Separar as duas coisas evita que a etapa 5 misture domínio puro com interface de administração.

**Etapa 8 não é opcional apesar de tardia** — `plans` e `subscriptions` precisam de seed mínimo já na etapa 0, senão o `ActiveSubscriptionGuard` bloqueia o sistema inteiro. O que fica para a etapa 8 é o CRUD comercial, a checagem de limites (RN48–RN51) e o onboarding, que é integrador por natureza: depende de centros de custo (etapa 2), convites (8.1) e matriz padrão (etapa 2).

**Etapa 9 depende de dados reais.** Métricas e tempo médio de aprovação (RF76) só fazem sentido com pedidos decididos no banco — os três timestamps de `purchase_requests` (`created_at`, `submitted_at`, `finalized_at`) existem exatamente para alimentá-las.

### Fora de escopo

RF38 (versionamento da matriz), RF44 e RF46 (campos dinâmicos por categoria) foram removidos durante a modelagem — ver [requirements.md](./requirements.md#escopo-fora-desta-versão). Todos os demais 83 RFs estão cobertos pelas etapas acima.

**RF72** (notificação em tempo real, sem recarregar a página) exige WebSocket ou SSE — infraestrutura própria, não coberta pela fila de e-mail da etapa 7. Se o polling do TanStack Query for suficiente na v1, o requisito fica parcialmente atendido; caso contrário, é uma task adicional na etapa 7.

---

## Registro de decisões

| Decisão | Escolha | Motivo | Revisitar quando |
|---|---|---|---|
| Framework de front | Vite + React (SPA) | Nest já é servidor e auth; painel atrás de login dispensa SSR | RF65 não bater o FCP da RNF10 |
| Deploy | Processo único | Menos infra; RNF12 já atendido pela fila | P95 degradando ou >1 réplica |
| Pastas | `domain`/`application`/`dto`/`infrastructure` | Feature em uma pasta; fronteira pronta para extração | — |
| Token de DI | Classe abstrata `I<Nome>` | Token em runtime sem Nest no domínio | — |
| Composição | Caso de uso chama caso de uso, nunca repositório alheio | Módulo controla o que expõe | Escrita atômica entre módulos |
| Transação | `IUnitOfWork` + `AsyncLocalStorage` | Caso de uso atômico sem importar Prisma | — |
| Tenant | `AsyncLocalStorage`, não `REQUEST`-scoped | Worker e cron não têm request | — |
| Motor de rotas | Domínio puro, sem I/O | Determinismo (RNF15), testabilidade, latência (RNF09) | — |
| Saldo | Derivado de `budget_entries` | Campo mutável permite escrita concorrente sobrescrita | Se a soma ficar lenta |
| Rota de aprovação | Congelada em `approval_steps` | RN22 — matriz alterada não afeta pedido em andamento | — |
