# AprovAI — Modelo de Dados

> Modelagem física derivada de **[requirements.md](./requirements.md)**, que é a fonte da verdade para RF, RNF e RN. As referências no formato `RF__`, `RNF__` e `RN__` ao longo deste documento apontam para lá.
>
> Como o código que acessa estas tabelas se organiza: **[architecture.md](./architecture.md)**.

**21 tabelas** e **18 enums**.

## Convenções

| Marca | Significado |
|---|---|
| `PK` | Chave primária |
| `FK` | Chave estrangeira |
| `UQ` | Restrição de unicidade |
| `IDX` | Índice |
| `?` | Aceita nulo (*nullable*) |
| *sem marca* | Obrigatório (`NOT NULL`) |
| `[enum]` | Campo enumerado |
| `FK self` | Auto-relacionamento (aponta para a própria tabela) |

**Regras gerais adotadas:**

- Todo valor monetário é `BIGINT` em centavos, com sufixo `_cents` (RNF23). `INT` não é usado porque estoura em R$ 21.474.836,47.
- Toda entidade de negócio carrega `company_id` — é o que garante o isolamento entre tenants (RNF03).
- Exclusão é lógica via `disabled_at` (RNF26). `NULL` significa registro ativo.
- Datas e horas em `TIMESTAMPTZ` (com fuso).
- CNPJ armazenado como `CHAR(14)`, apenas dígitos. A formatação é responsabilidade da interface.

---

## Enums

### 1. `user_role`
Papel do membro dentro de uma empresa.
```
REQUESTER
APPROVER
FINANCE_ADMIN
```
> O SuperAdmin da plataforma **não** entra aqui — ele opera acima dos tenants (RN43). Modelado como flag `is_super_admin` em `users`.

### 2. `token_type`
```
EMAIL_VERIFICATION      expira em 24h
PASSWORD_RESET          expira em 1h
PASSWORD_CHANGE         expira em 1h
INVITE                  expira em 72h    (RN04)
APPROVAL_ACTION         expira em 7 dias (RN28)
```

### 3. `onboarding_step`
```
ACCOUNT
COMPANY
TEAM
REVIEW
DONE
```

### 4. `invite_status`
```
PENDING
ACCEPTED
EXPIRED
REVOKED
```

### 5. `budget_entry_type`
```
CONSUMPTION     valor positivo — consome saldo
REVERSAL        valor negativo — devolve saldo
```

### 6. `approver_type`
```
DIRECT_MANAGER          chefe direto do solicitante
COST_CENTER_MANAGER     gestor do centro de custo do pedido
```

### 7. `registration_status`
Situação cadastral do CNPJ na Receita Federal.
```
ACTIVE
CLOSED
INACTIVE
SUSPENDED
VOID
UNKNOWN
```

### 8. `validation_status`
Se a consulta à API pública foi bem-sucedida.
```
VALIDATED
PENDING
FAILED
```

### 9. `urgency`
```
LOW
MEDIUM
HIGH
```

### 10. `request_status`
```
DRAFT                 não consome saldo, não notifica  (RN37)
PENDING               rota calculada, aguardando decisão
CHANGES_REQUESTED     devolvido ao solicitante         (RN39)
APPROVED              consome saldo                    (RN17)
REJECTED              terminal
CANCELED              terminal, libera saldo           (RN40)
COMPLETED             terminal, compra liquidada
```

### 11. `step_status`
```
WAITING
APPROVED
REJECTED
ESCALATED
CANCELED
```

### 12. `decision_type`
```
APPROVED
REJECTED
CHANGES_REQUESTED
APPROVED_WITH_OVERRIDE
```

### 13. `decision_channel`
```
PLATFORM
EMAIL
```

### 14. `file_type`
```
REQUEST_ATTACHMENT
USER_AVATAR
ORG_LOGO
```

### 15. `audit_event_type`
```
CREATED
SUBMITTED
APPROVED
REJECTED
CHANGES_REQUESTED
CANCELED
REASSIGNED
ESCALATED
RULES_CHANGED
BUDGET_CHANGED
MEMBER_CHANGED
```

### 16. `notification_event`
```
INVITE_RECEIVED
REQUEST_PENDING
DECISION_MADE
REQUEST_RETURNED
SLA_REMINDER
ESCALATED
BUDGET_ALERT
MONTHLY_REPORT
```

### 17. `plan_tier`
```
BASIC
PROFESSIONAL
ENTERPRISE
```

### 18. `subscription_status`
```
ACTIVE
TRIALING
CANCELED
EXPIRED
```

---

## Tabelas

### Contexto: Identidade

#### `users`
A pessoa física. Única na plataforma, independentemente do vínculo com a empresa.

```
id | UUID | PK
name | VARCHAR(120)
email | VARCHAR(180) | UQ
phone | VARCHAR(20) | ?
password_hash | VARCHAR(255) | ?
email_verified | BOOLEAN
avatar_url | VARCHAR(500) | ?
is_super_admin | BOOLEAN
terms_accepted_at | TIMESTAMP | ?
created_at | TIMESTAMP
updated_at | TIMESTAMP
disabled_at | TIMESTAMP | ?
```

- `email` único implementa a RN01.
- `password_hash` é nulo para contas criadas via Google OAuth (RF04).
- `terms_accepted_at` registra o aceite exigido pelo RF08.
- `is_super_admin` marca o operador da plataforma — não é role de `company_members`, porque ele opera acima dos tenants (RN43). Acessa dados de gestão (empresas, planos, assinaturas), nunca os dados operacionais de compras.

#### `tokens`
Token temporário de uso único. Uma tabela para todos os tipos.

```
id | UUID | PK
user_id | UUID | FK | ?
type | ENUM(token_type)
value | VARCHAR(255) | UQ
reference_id | UUID | ?
expires_at | TIMESTAMP
consumed_at | TIMESTAMP | ?
created_at | TIMESTAMP

IDX (value)
IDX (user_id, type)
IDX (expires_at)
```

- `value` guarda o **hash** do token, nunca o token em claro.
- `user_id` é nulo no convite, pois o destinatário ainda não tem conta.
- `reference_id` aponta para `invites.id` ou `approval_steps.id` conforme o tipo — sem FK, por ser polimórfico.
- `consumed_at` preenchido invalida o token (RN28).

---

### Contexto: Empresa

#### `companies`
A empresa cliente. É o **tenant** e assina o plano.

```
id | UUID | PK
slug | VARCHAR(80) | UQ
legal_name | VARCHAR(180)
trade_name | VARCHAR(180) | ?
cnpj | CHAR(14) | UQ
industry | VARCHAR(80) | ?
company_size | VARCHAR(20) | ?
onboarding_step | ENUM(onboarding_step)
onboarding_completed_at | TIMESTAMP | ?
overrun_tolerance_percent | DECIMAL(5,2)
reminder_hours | INT
escalation_hours | INT
dual_approval_threshold_cents | BIGINT | ?
created_at | TIMESTAMP
updated_at | TIMESTAMP
disabled_at | TIMESTAMP | ?
```

**Parâmetros de política** (configuráveis por empresa, com valores-padrão):

| Campo | Padrão | Regra |
|---|---|---|
| `overrun_tolerance_percent` | 5,00 | RN18 |
| `reminder_hours` | 24 | RN31 |
| `escalation_hours` | 72 | RN32 |
| `dual_approval_threshold_cents` | `NULL` | RN26 — nulo significa que a empresa não exige dupla aprovação |

- `cnpj` único implementa a RN12.
- `onboarding_completed_at` nulo bloqueia a operação da empresa (RN10).

#### `company_members`
O vínculo pessoa ↔ empresa. Concentra papel, alçada, hierarquia e ausência.

```
id | UUID | PK
user_id | UUID | FK
company_id | UUID | FK
role | ENUM(user_role)
approval_limit_cents | BIGINT
default_cost_center_id | UUID | FK | ?
manager_id | UUID | FK self | ?
absent_from | DATE | ?
absent_until | DATE | ?
substitute_id | UUID | FK self | ?
created_at | TIMESTAMP
updated_at | TIMESTAMP
disabled_at | TIMESTAMP | ?

UQ (user_id, company_id)
```

- `manager_id` é o auto-relacionamento que forma a **árvore de hierarquia** (RF23), percorrida pela cascata da RN24.
- `absent_from` / `absent_until` / `substitute_id` implementam a substituição temporária (RF24, RN29) sem exigir tabela própria.
- `approval_limit_cents` obrigatório com padrão `0` — zero significa "não aprova", que é informação; nulo significaria "indefinido", que quebraria o motor de rotas.
- Validação de aplicação: `manager_id` e `substitute_id` não podem apontar para o próprio registro (evita laço infinito na cascata).

#### `invites`
Convite pendente por e-mail.

```
id | UUID | PK
company_id | UUID | FK
email | VARCHAR(180)
role | ENUM(user_role)
default_cost_center_id | UUID | FK | ?
manager_id | UUID | FK | ?
status | ENUM(invite_status)
invited_by_id | UUID | FK
created_at | TIMESTAMP
accepted_at | TIMESTAMP | ?
revoked_at | TIMESTAMP | ?

UQ (company_id, email) WHERE status = PENDING
IDX (company_id, status)
IDX (email)
```

- O `UQ` é **índice parcial**: permite um único convite pendente por e-mail/empresa, mas mantém o histórico de convites expirados e revogados.
- O token do convite vive em `tokens` (tipo `INVITE`), não aqui.
- `role`, `default_cost_center_id` e `manager_id` são copiados para `company_members` no aceite (RF19).

---

### Contexto: Estrutura Financeira

#### `cost_centers`
A unidade orçamentária que gasta.

```
id | UUID | PK
company_id | UUID | FK
name | VARCHAR(120)
code | VARCHAR(40) | ?
manager_id | UUID | FK
parent_id | UUID | FK self | ?
created_at | TIMESTAMP
updated_at | TIMESTAMP
disabled_at | TIMESTAMP | ?

UQ (company_id, name)
IDX (company_id)
IDX (manager_id)
```

- `manager_id` obrigatório implementa a RN14 — todo CC ativo tem exatamente um gestor.
- `parent_id` permite a hierarquia entre centros (RF27).
- `disabled_at` implementa a RN15: CC com pedidos em andamento é inativado, nunca excluído.

#### `cost_center_members`
Quais membros podem lançar pedidos em quais centros de custo (RF28).

```
id | UUID | PK
cost_center_id | UUID | FK
member_id | UUID | FK
created_at | TIMESTAMP

UQ (cost_center_id, member_id)
IDX (cost_center_id)
IDX (member_id)
```

#### `budgets`
Teto de gasto de um centro de custo em um período.

```
id | UUID | PK
cost_center_id | UUID | FK
period_start | DATE
period_end | DATE
total_amount_cents | BIGINT
change_reason | VARCHAR(255) | ?
updated_by_id | UUID | FK | ?
created_at | TIMESTAMP
updated_at | TIMESTAMP

UQ (cost_center_id, period_start)
IDX (cost_center_id, period_start, period_end)
```

- **Uma linha por CC por período.** É isso que implementa a RN16 (saldo não acumula): abril começa zerado porque é outro registro, não porque um campo foi resetado.
- **Não existe campo de saldo.** O saldo é derivado de `budget_entries` — um campo mutável permitiria que dois aprovadores simultâneos gravassem por cima um do outro.
- `change_reason` e `updated_by_id` registram a alteração de orçamento em curso (RF30).

#### `budget_entries`
Extrato imutável das movimentações de saldo.

```
id | UUID | PK
budget_id | UUID | FK
purchase_request_id | UUID | FK
type | ENUM(budget_entry_type)
amount_cents | BIGINT
description | VARCHAR(255) | ?
recorded_by_id | UUID | FK | ?
occurred_at | TIMESTAMP

IDX (budget_id)
IDX (purchase_request_id)
IDX (budget_id, occurred_at)
```

**Cálculo do saldo:**

```sql
SELECT
  b.total_amount_cents                                    AS orcamento,
  COALESCE(SUM(e.amount_cents), 0)                        AS comprometido,
  b.total_amount_cents - COALESCE(SUM(e.amount_cents), 0) AS disponivel
FROM budgets b
LEFT JOIN budget_entries e ON e.budget_id = b.id
WHERE b.cost_center_id = $1
  AND $2 BETWEEN b.period_start AND b.period_end
GROUP BY b.id;
```

- `amount_cents` carrega o sinal: positivo consome, negativo devolve. Isso permite somar direto, sem `CASE`.
- Tabela **append-only**: correção se faz com um novo lançamento `REVERSAL`, nunca com `UPDATE` ou `DELETE`.
- `recorded_by_id` nulo indica ação automática do sistema.
- A criação da entrada e a mudança de status do pedido devem ocorrer na **mesma transação** (RNF17).

#### `approval_rules`
A matriz de alçadas: faixas de valor e quem decide cada uma.

```
id | UUID | PK
company_id | UUID | FK
cost_center_id | UUID | FK | ?
category_id | UUID | FK | ?
min_amount_cents | BIGINT
max_amount_cents | BIGINT | ?
approver_type | ENUM(approver_type)
requires_dual_approval | BOOLEAN
created_at | TIMESTAMP
updated_at | TIMESTAMP

IDX (company_id, min_amount_cents)
```

- `cost_center_id` / `category_id` nulos = **regra global**; preenchidos = regra específica que se sobrepõe à global (RF35).
- `max_amount_cents` nulo = faixa sem teto (a última da matriz).
- **Desempate por especificidade**, não por ordem manual:

```sql
ORDER BY (cost_center_id IS NOT NULL) DESC,
         (category_id IS NOT NULL) DESC
```

---

### Contexto: Cadastros

#### `suppliers`
Fornecedores validados na Receita Federal.

```
id | UUID | PK
company_id | UUID | FK
cnpj | CHAR(14)
legal_name | VARCHAR(180)
trade_name | VARCHAR(180) | ?
registration_status | ENUM(registration_status)
validation_status | ENUM(validation_status)
street | VARCHAR(200) | ?
city | VARCHAR(120) | ?
state | CHAR(2) | ?
zip_code | VARCHAR(9) | ?
email | VARCHAR(180) | ?
phone | VARCHAR(20) | ?
validated_at | TIMESTAMP | ?
blocked | BOOLEAN
created_at | TIMESTAMP
updated_at | TIMESTAMP

UQ (company_id, cnpj)
```

**Os dois status respondem perguntas diferentes:**

| Campo | Pergunta |
|---|---|
| `registration_status` | O que a Receita diz sobre este CNPJ? |
| `validation_status` | Conseguimos consultar a Receita? |

```
CLOSED  + VALIDATED  →  CNPJ baixado: bloqueia a submissão  (RN34)
UNKNOWN + FAILED     →  API indisponível: permite criar,
                         mas bloqueia a aprovação            (RN35)
```

- Endereço todo nulo porque vem da BrasilAPI — se a consulta falhar (RNF14), o cadastro é manual.
- `blocked` é decisão comercial da empresa, independente da situação na Receita (RF41).
- `validated_at` alimenta o job de revalidação periódica (RF42).

#### `categories`
Classificação da compra.

```
id | UUID | PK
company_id | UUID | FK
name | VARCHAR(120)
description | VARCHAR(255) | ?
active | BOOLEAN
created_at | TIMESTAMP
updated_at | TIMESTAMP

UQ (company_id, name)
IDX (company_id, active)
```

> Convém semear categorias padrão na criação da empresa, evitando um seletor vazio no primeiro pedido.

---

### Contexto: Compras

#### `purchase_requests`
O pedido de compra — núcleo do sistema.

```
id | UUID | PK
number | VARCHAR(20)
company_id | UUID | FK
requester_id | UUID | FK
cost_center_id | UUID | FK
category_id | UUID | FK | ?
supplier_id | UUID | FK | ?
title | VARCHAR(180)
description | TEXT
total_amount_cents | BIGINT
urgency | ENUM(urgency)
status | ENUM(request_status)
payment_terms | VARCHAR(120) | ?
requires_override | BOOLEAN
created_at | TIMESTAMP
submitted_at | TIMESTAMP | ?
finalized_at | TIMESTAMP | ?
canceled_by_id | UUID | FK | ?
cancel_reason | VARCHAR(255) | ?
updated_at | TIMESTAMP

UQ (company_id, number)
IDX (company_id, status)
IDX (requester_id, status)
IDX (cost_center_id, status)
IDX (supplier_id, created_at)
```

- `number` é o identificador legível (`REQ-2026-0042`) usado na comunicação entre pessoas; `id` é o identificador técnico.
- **Três datas distintas** contam a história e permitem medir o tempo de aprovação (RF76): `created_at` (rascunho), `submitted_at` (entrou no fluxo — marco inicial do SLA) e `finalized_at` (decidido).
- `cost_center_id` obrigatório implementa a RN13.
- `supplier_id` nulo apenas em rascunho; obrigatório na submissão, pois a RN34 depende dele.
- `requires_override` é marcado na submissão quando o valor já ultrapassa a tolerância (RN19).
- **Não existem campos de aprovador ou data de aprovação aqui** — um pedido tem múltiplos aprovadores, modelados em `approval_steps`.

#### `request_items`
As linhas do pedido.

```
id | UUID | PK
purchase_request_id | UUID | FK
description | VARCHAR(255)
quantity | DECIMAL(12,3)
unit | VARCHAR(20)
unit_price_cents | BIGINT
total_cents | BIGINT

IDX (purchase_request_id)
```

#### `files`
Anexos e demais arquivos do sistema.

```
id | UUID | PK
company_id | UUID | FK
type | ENUM(file_type)
purchase_request_id | UUID | FK | ?
user_id | UUID | FK | ?
file_name | VARCHAR(255)
mime_type | VARCHAR(120)
size_bytes | BIGINT
storage_key | VARCHAR(500)
uploaded_by_id | UUID | FK
uploaded_at | TIMESTAMP

IDX (purchase_request_id)
IDX (company_id, type)
```

- Tabela única para todos os tipos de arquivo, com **FKs opcionais** por tipo de dono — mantém a integridade referencial que uma associação polimórfica perderia.
- `storage_key` guarda apenas o caminho no bucket, não a URL completa: URLs assinadas expiram e o provedor pode mudar.
- `size_bytes` alimenta o controle de `max_storage_bytes` do plano.

---

### Contexto: Aprovação

#### `approval_steps`
Os níveis da cascata de aprovação.

```
id | UUID | PK
purchase_request_id | UUID | FK
expected_approver_id | UUID | FK
step_order | INT
status | ENUM(step_status)
requires_dual_approval | BOOLEAN
reminder_due_at | TIMESTAMP | ?
escalation_due_at | TIMESTAMP | ?
escalated_from_id | UUID | FK | ?
escalated_at | TIMESTAMP | ?
started_at | TIMESTAMP | ?
ended_at | TIMESTAMP | ?

IDX (purchase_request_id, step_order)
IDX (expected_approver_id, status)
IDX (status, escalation_due_at)
```

**Exemplo — pedido de R$ 50.000 com transbordo:**

```
step_order  aprovador   status     started   ended
    1       João        APPROVED   08/03     09/03
    2       Marina      WAITING    09/03     —      ← parado aqui
```

- `step_order` **é regra de negócio**, não ordenação visual: define quem decide primeiro na cascata (RN24).
- As etapas são criadas **todas na submissão**, permitindo ao solicitante ver a linha do tempo completa (RF53).
- `requires_dual_approval` é **copiado** de `approval_rules` no momento da submissão. É essa materialização que implementa a RN22 — alterações posteriores na matriz não afetam pedidos em andamento.
- `started_at` é o marco a partir do qual os prazos de SLA são calculados; a etapa 2 só começa a contar quando a etapa 1 é aprovada.
- `escalated_from_id` registra o aprovador original quando há escalonamento (RN32), evitando que a auditoria sugira que o novo aprovador era o titular da etapa.
- O índice `(status, escalation_due_at)` sustenta o job de SLA. Convém torná-lo parcial:

```sql
CREATE INDEX idx_steps_sla ON approval_steps (status, escalation_due_at)
  WHERE status = 'WAITING';
```

**Regra de fechamento:**

```
todas as etapas APPROVED  →  purchase_request = APPROVED
                          →  cria budget_entry (CONSUMPTION)   (RN17)

qualquer etapa REJECTED   →  purchase_request = REJECTED
                          →  encerra o fluxo                   (RN25)
```

#### `decisions`
O ato de decidir, com o contexto financeiro congelado.

```
id | UUID | PK
approval_step_id | UUID | FK
decider_id | UUID | FK
on_behalf_of_id | UUID | FK | ?
type | ENUM(decision_type)
justification | TEXT | ?
budget_at_time_cents | BIGINT
committed_at_time_cents | BIGINT
available_at_time_cents | BIGINT
channel | ENUM(decision_channel)
ip_address | VARCHAR(45) | ?
decided_at | TIMESTAMP

IDX (approval_step_id)
IDX (decider_id, decided_at)
```

**Por que é 1:N com `approval_steps`** — dois casos exigem mais de uma decisão na mesma etapa:

```
Dupla aprovação (RN26):
  step 3 → Marina APPROVED
        → Carlos APPROVED          duas assinaturas distintas

Devolução e retorno (RN39):
  step 1 → João CHANGES_REQUESTED  "faltou a proposta"   10/03
        → João APPROVED            "ok, completo"        12/03
```

Com campos na própria etapa, a segunda decisão sobrescreveria a primeira e o histórico se perderia.

- Os três campos `*_at_time_cents` implementam a RN47: se o orçamento for editado depois (RF30), a auditoria continua mostrando o contexto real da decisão.
- `on_behalf_of_id` preenchido indica ação de substituto (RN29) — a trilha registra "Carlos decidiu em nome de Marina".
- `justification` é obrigatória por regra de aplicação (mínimo 10 caracteres) quando o tipo é `REJECTED`, `CHANGES_REQUESTED` ou `APPROVED_WITH_OVERRIDE` (RN44).
- `ip_address` com 45 caracteres acomoda IPv6.

---

### Contexto: Suporte

#### `audit_logs`
Trilha imutável de todos os eventos (RN45, RNF25).

```
id | UUID | PK
company_id | UUID | FK
actor_id | UUID | FK | ?
event_type | ENUM(audit_event_type)
entity_type | VARCHAR(60)
entity_id | UUID
old_data | JSONB | ?
new_data | JSONB | ?
ip_address | VARCHAR(45) | ?
occurred_at | TIMESTAMP

IDX (company_id, occurred_at)
IDX (entity_type, entity_id)
IDX (actor_id, occurred_at)
```

- `entity_id` **sem FK propositalmente**: o log precisa sobreviver mesmo que o registro original deixe de existir. É o único ponto do modelo onde a associação polimórfica é a escolha correta.
- `actor_id` nulo indica ação do agendador.
- Sem `updated_at` — a tabela é *append-only*. Convém reforçar no próprio banco:

```sql
REVOKE UPDATE, DELETE ON audit_logs FROM app_user;
```

#### `notifications`
Avisos no aplicativo e por e-mail.

```
id | UUID | PK
recipient_id | UUID | FK
company_id | UUID | FK
event | ENUM(notification_event)
title | VARCHAR(180)
message | TEXT
link | VARCHAR(500) | ?
read_at | TIMESTAMP | ?
sent_by_email | BOOLEAN
created_at | TIMESTAMP

IDX (recipient_id, read_at)
IDX (recipient_id, created_at)
```

- `recipient_id` aponta para `users`, não para `company_members`: a notificação pertence à pessoa e sobrevive a mudanças de vínculo. `company_id` indica o contexto de origem.
- `read_at` nulo alimenta o contador de não lidas (RF71).

---

### Contexto: Comercial

#### `plans`
Catálogo comercial. Vive fora das empresas.

```
id | UUID | PK
name | VARCHAR(80)
tier | ENUM(plan_tier) | UQ
price_cents | BIGINT
max_members | INT | ?
max_requests_month | INT | ?
max_storage_bytes | BIGINT | ?
features | JSONB
active | BOOLEAN
created_at | TIMESTAMP
updated_at | TIMESTAMP
```

- Limites nulos significam **ilimitado**.
- `features` é uma lista de slugs: `["ai-extraction", "email-approval", "monthly-report"]`. A verificação de acesso vira `plan.features.includes(slug)`, eliminando três tabelas de junção.

#### `subscriptions`
O contrato vigente de uma empresa.

```
id | UUID | PK
company_id | UUID | FK
plan_id | UUID | FK
status | ENUM(subscription_status)
period_start | TIMESTAMP
period_end | TIMESTAMP | ?
contracted_price_cents | BIGINT | ?
feature_overrides | JSONB | ?
canceled_at | TIMESTAMP | ?
created_at | TIMESTAMP

IDX (company_id, status)
UQ (company_id) WHERE status IN (ACTIVE, TRIALING)
```

- O `UQ` é **índice parcial** e implementa a RN48 — uma única assinatura ativa por empresa:

```sql
CREATE UNIQUE INDEX idx_one_active_subscription
  ON subscriptions (company_id)
  WHERE status IN ('ACTIVE', 'TRIALING');
```

- `contracted_price_cents` acomoda preço negociado, diferente do preço de tabela.
- `feature_overrides` implementa a RN51:

```json
{ "grant": ["ai-extraction"], "block": [], "expires_at": "2026-12-31" }
```

---

## Mapa de Relacionamentos

```
users ──1:N── company_members ──N:1── companies
  │               │                        │
  └──1:N── tokens ├── manager_id ──┐       ├──1:N── invites
                  │  (auto-relação) │      ├──1:N── suppliers
                  └── substitute_id ┘      ├──1:N── categories
                                           ├──1:N── approval_rules
                                           ├──1:N── audit_logs
                                           └──1:N── subscriptions ──N:1── plans

companies ──1:N── cost_centers ──1:N── budgets ──1:N── budget_entries
                       │  (parent_id: auto-relação)            │
                       ├──1:N── cost_center_members            │
                       └──1:N── purchase_requests ─────────────┘
                                    ├──1:N── request_items
                                    ├──1:N── files
                                    └──1:N── approval_steps ──1:N── decisions
```

### Cardinalidades que carregam regra

| Relação | Cardinalidade | Regra |
|---|---|---|
| `users` ↔ `companies` | N:N via `company_members` | Estrutura preparada para múltiplos vínculos; a v1 restringe a um por usuário (RN01) |
| `purchase_requests` → `cost_centers` | N:1 | Exatamente um CC ativo (RN13) |
| `cost_centers` → `budgets` | 1:N | Um por período, sem acúmulo (RN16) |
| `budgets` → `budget_entries` | 1:N | Extrato imutável do consumo |
| `purchase_requests` → `approval_steps` | 1:N | Cascata hierárquica (RN24) |
| **`approval_steps` → `decisions`** | **1:N** | **Uma decisão normalmente; duas na dupla aprovação (RN26); mais em caso de devolução (RN39)** |
| `companies` → `subscriptions` | 1:N | Apenas uma ativa por vez (RN48) |
| `company_members` → si mesma | N:1 | `manager_id` forma a árvore de hierarquia (RN24) |

---

## Rastreabilidade — Regra de Negócio × Modelo

| Regra | Como o modelo atende |
|---|---|
| RN01 — e-mail único, um vínculo por usuário | `users.email` UQ + `company_members` UQ `(user_id, company_id)` |
| RN03 — sempre um admin ativo | Consulta em `company_members` antes de inativar |
| RN04 — convite expira em 72h | `tokens.expires_at` com `type = INVITE` |
| RN12 — CNPJ único | `companies.cnpj` UQ |
| RN13 — exatamente um CC | `purchase_requests.cost_center_id` obrigatório |
| RN16 — período sem acúmulo | Uma linha em `budgets` por período |
| RN17 — aprovar deduz saldo | Cria `budget_entries` do tipo `CONSUMPTION` |
| RN18 — tolerância de 5% | `companies.overrun_tolerance_percent` |
| RN22 — rota congelada | `approval_steps` materializadas na submissão |
| RN23 — não aprova o próprio pedido | `requester_id` ≠ `expected_approver_id` |
| RN24 — cascata hierárquica | `company_members.manager_id` percorrido pelo motor |
| RN26 — dupla aprovação | `approval_steps` 1:N `decisions` + `requires_dual_approval` |
| RN28 — token de uso único | `tokens.expires_at` + `consumed_at` |
| RN29 — ação de substituto | `decisions.on_behalf_of_id` |
| RN31 / RN32 — SLA | `approval_steps.reminder_due_at` / `escalation_due_at` |
| RN34 — bloqueia CNPJ inapto | `suppliers.registration_status` |
| RN35 — fornecedor não validado | `suppliers.validation_status` |
| RN36 — detecta duplicidade | Consulta por `supplier_id` + `total_amount_cents` ±5% + `created_at` em 30 dias |
| RN39 — devolução e reenvio | `decisions.type = CHANGES_REQUESTED` |
| RN41 — reversão de aprovado | `budget_entries` do tipo `REVERSAL` |
| RN44 — justificativa mínima | `decisions.justification` validada na aplicação |
| RN45 — auditoria imutável | `audit_logs` sem rota de UPDATE/DELETE |
| RN47 — contexto congelado | `decisions.budget_at_time_cents` e correlatos |
| RN48 — uma assinatura ativa | Índice parcial em `subscriptions` |
| RN49 — limite de membros | `plans.max_members` verificado antes do convite |
| RNF03 — isolamento de tenant | `company_id` em toda entidade de negócio |

---

## Escopo

**As 21 tabelas entram no schema.** Não há subconjunto reduzido: o `schema.prisma` materializa a modelagem completa desde a primeira migration, e todas as FKs nascem com a constraint definitiva.

O motivo é que o schema é declarativo — escrever as 21 custa pouco mais que escrever 12, e evita a sequência de migrations incrementais que a alternativa exigiria. Também mantém a modelagem íntegra: `approval_rules.category_id` e `purchase_requests.category_id` apontam para `categories` de verdade, em vez de ficarem nulos aguardando a tabela existir.

### Ordem de povoamento

Todas as tabelas existem, mas nem todas recebem dados ao mesmo tempo. A ordem segue a implementação dos módulos ([architecture.md §7](./architecture.md)):

| Fase | Tabelas em uso |
|---|---|
| Núcleo do fluxo | `users`, `companies`, `company_members`, `tokens`, `cost_centers`, `budgets`, `budget_entries`, `approval_rules`, `suppliers`, `categories`, `purchase_requests`, `request_items`, `approval_steps`, `decisions`, `audit_logs` |
| Colaboração | `invites`, `cost_center_members`, `files`, `notifications` |
| Comercial | `plans`, `subscriptions` |

Uma tabela vazia não custa nada em runtime. O que custaria é descobrir na terceira migration que uma FK precisava existir desde o início.

### Seeds necessários

Com todas as tabelas presentes, dois seeds deixam de ser opcionais:

- **`categories`** — semear categorias padrão na criação da empresa, senão o seletor do primeiro pedido nasce vazio.
- **`plans`** — ao menos um plano ativo, senão nenhuma empresa consegue ter assinatura e o `ActiveSubscriptionGuard` bloqueia tudo.
