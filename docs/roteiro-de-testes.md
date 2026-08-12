# Roteiro de testes manuais — AprovAI API

108 rotas em 21 controllers. **Não teste rota por rota.** Este roteiro encadeia
14 fases em ordem de dependência: cada fase produz os IDs que a próxima consome.
Seguindo assim, ~85 rotas são exercidas como efeito colateral do fluxo, e sobram
poucas variações para testar isoladamente.

**Tempo estimado:** 3h para as fases 0–12. A fase 13 (agendador) exige mexer no
banco. A fase 14 (segurança) é a mais importante e leva 30 min.

---

## Antes de começar

```bash
docker compose up -d
pnpm db:deploy
pnpm start:dev
```

Swagger em `http://localhost:3000/docs`. Todas as rotas abaixo têm prefixo
`/api`.

### Autenticação é por cookie, não por header

O login devolve `access_token` e `refresh_token` como cookie `httpOnly`. Em curl
isso significa **um cookie jar por pessoa**:

```bash
BASE=http://localhost:3000/api

# cada persona tem seu arquivo de cookie
curl -s -c /tmp/ana.txt -b /tmp/ana.txt "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@teste.com","password":"Senha@123"}'

# daí em diante, sempre -b /tmp/ana.txt
curl -s -b /tmp/ana.txt "$BASE/users/me" | jq
```

No Swagger, o `persistAuthorization` já está ligado e o navegador guarda o
cookie sozinho — dá para testar clicando, mas só com **uma** persona por vez.
Para trocar de persona sem confusão, use uma janela anônima por perfil.

### Personas que o roteiro usa

| Persona | Papel | Para quê |
|---|---|---|
| **Dani** | FINANCE_ADMIN | dona da empresa, configura tudo |
| **Bruno** | APPROVER | aprova, é o gargalo dos testes de SLA |
| **Ana** | REQUESTER | cria os pedidos |
| **Carla** | REQUESTER | prova isolamento: não pode ver nada da Ana |
| **Edu** | outra empresa | prova isolamento entre tenants |
| **Root** | SuperAdmin | rotas de plataforma |

---

## Fase 0 — Fumaça (5 min)

| # | Ação | Deve retornar |
|---|---|---|
| 0.1 | `GET /docs` no navegador | Swagger carrega com 21 tags |
| 0.2 | `GET /purchase-requests` sem cookie | **401**, não 500 nem 404 |
| 0.3 | `GET /rota-que-nao-existe` | **404** com corpo JSON, não HTML |

Se 0.2 devolver 200, pare tudo: o guard global não está ativo.

---

## Fase 1 — Contas

| # | Rota | Corpo | Esperado |
|---|---|---|---|
| 1.1 | `POST /auth/register` | `{"name":"Dani","email":"dani@teste.com","password":"Senha@123"}` | **201** + usuário. E-mail de verificação sai no log (modo log sem `RESEND_API_KEY`) |
| 1.2 | `POST /auth/login` antes de verificar | mesmas credenciais | **403** `EmailNotVerified` |
| 1.3 | `GET /auth/verify-email?token=...` | token do log | **200** |
| 1.4 | `POST /auth/login` | mesmas credenciais | **200** + cookies `access_token` e `refresh_token` |
| 1.5 | `GET /users/me` | — | **200** com `emailVerified: true` |
| 1.6 | `POST /auth/refresh` | — | **200**, cookie novo |
| 1.7 | `POST /auth/logout` | — | **204**, cookie limpo |

Repita 1.1–1.4 para **Bruno**, **Ana**, **Carla** e **Edu**.

> **Atalho aceitável:** para não caçar 5 tokens no log, marque direto no banco
> `UPDATE users SET email_verified = true;` — mas faça o caminho completo pelo
> menos uma vez, na Dani.

### Recuperação de senha (teste uma vez)

`POST /auth/forgot-password` → **204** sempre (não revela se o e-mail existe —
isso é proposital) → pegue o token no log → `POST /auth/reset-password` → **204**
→ login com a senha nova funciona, com a antiga dá **401**.

---

## Fase 2 — Empresa e onboarding

Tudo como **Dani**.

| # | Rota | Corpo | Esperado |
|---|---|---|---|
| 2.1 | `POST /companies` | `{"legalName":"Aprovia Testes LTDA","cnpj":"11222333000181","tradeName":"Aprovia"}` | **201**. Guarde nada — a sessão já vira dessa empresa |
| 2.2 | `POST /auth/login` de novo | — | necessário: o cookie antigo não tem `companyId` |
| 2.3 | `GET /companies/me` | — | **200**, `onboardingStep: "ACCOUNT"` |
| 2.4 | `GET /billing/subscription` | — | **200**, `status: "TRIALING"`, plano Profissional, `usedSeats: 1` |
| 2.5 | `GET /onboarding` | — | **200**, `canComplete: false`, dois requisitos pendentes |
| 2.6 | `POST /onboarding/complete` | — | **409** listando o que falta |
| 2.7 | `POST /purchase-requests` | qualquer corpo | **409** "configuração inicial ainda não foi concluída" (RN10) |
| 2.8 | `GET /onboarding/cnpj/11222333000181` | — | **200** com dados da Receita, ou `ok:false` se a BrasilAPI estiver fora |

O passo **2.4** é o que prova que a empresa nasce operável. Se vier
`hasActiveSubscription: false`, os planos não foram semeados — rode
`pnpm db:deploy` de novo.

---

## Fase 3 — Estrutura

| # | Rota | Corpo | Esperado |
|---|---|---|---|
| 3.1 | `POST /cost-centers` | `{"name":"TI","code":"CC-TI","managerId":"<memberId da Dani>"}` | **201** — pegue o `memberId` em `GET /members` |
| 3.2 | `GET /onboarding` | — | `costCenterWithManager: true`, `canComplete` ainda false |
| 3.3 | `POST /onboarding/complete` | — | **201**, `onboardingStep: "DONE"` |
| 3.4 | `GET /approval-rules` | — | **200** com **3 faixas** provisionadas automaticamente (RF17) |
| 3.5 | `POST /cost-centers/:id/budgets` | `{"period":"2026-08","totalAmountCents":"10000000"}` | **201** — use o mês corrente |
| 3.6 | `GET /cost-centers/:id/budgets/current` | — | **200**, `committedCents: "0"`, `availableCents: "10000000"` |

### Matriz de alçadas

| # | Rota | Corpo | Esperado |
|---|---|---|---|
| 3.7 | `PUT /approval-rules` | faixas com buraco: `[{min:"0",max:"100000",...},{min:"500000",max:null,...}]` | **400** — a matriz precisa ser contínua |
| 3.8 | `PUT /approval-rules` | duas faixas abertas (`max:null` nas duas) | **400** |
| 3.9 | `PUT /approval-rules` | matriz válida de 2 faixas | **200** |
| 3.10 | `GET /approval-rules/resolve?amountCents=250000&costCenterId=...` | — | **200** indicando a faixa certa |
| 3.11 | `POST /approval-rules/simulate` | `{"amountCents":"250000","costCenterId":"...","requesterId":"<memberId Ana>"}` | **200** com a rota de aprovação, **sem gravar nada** |

O **3.7** e o **3.8** são os testes que mais pegam bug de matriz. Faça os dois.

---

## Fase 4 — Catálogo

| # | Rota | Corpo | Esperado |
|---|---|---|---|
| 4.1 | `GET /categories` | — | **200** com as categorias padrão criadas junto da empresa |
| 4.2 | `POST /categories` | `{"name":"Equipamentos"}` | **201** |
| 4.3 | `PATCH /categories/:id/active` | `{"active":false}` | **200** — usar categoria inativa num pedido deve falhar depois |
| 4.4 | `GET /suppliers/lookup/11222333000181` | — | **200** com dados públicos |
| 4.5 | `POST /suppliers` | `{"cnpj":"11222333000181","legalName":"Fornecedor Teste"}` | **201** |
| 4.6 | `POST /suppliers` mesmo CNPJ | igual | **409** duplicado |
| 4.7 | `POST /suppliers` | `{"cnpj":"11111111111111",...}` | **400** CNPJ inválido (dígito verificador) |
| 4.8 | `PATCH /suppliers/:id/blocked` | `{"blocked":true}` | **200** |
| 4.9 | `POST /suppliers/:id/revalidate` | — | **200** com a situação atualizada |

Deixe o fornecedor **desbloqueado** ao fim (`blocked:false`), senão a fase 6 trava.

---

## Fase 5 — Equipe

| # | Rota | Corpo | Esperado |
|---|---|---|---|
| 5.1 | `POST /invites` | `{"email":"bruno@teste.com","role":"APPROVER"}` | **201** `status: PENDING`. Link sai no log |
| 5.2 | `POST /invites` mesmo e-mail | igual | **409** "já existe convite pendente" |
| 5.3 | `GET /invites/token/:token` (sem login) | — | **200** com nome da empresa e papel, `actionable: true` |
| 5.4 | `POST /invites/token/:token/accept` **como Ana** | — | **403** — e-mail não confere (RN05) |
| 5.5 | `POST /invites/token/:token/accept` **como Bruno** | — | **201** `status: ACCEPTED` |
| 5.6 | repita 5.5 | — | **404/409** — token de uso único |
| 5.7 | `POST /auth/login` do Bruno | — | cookie novo, agora com `companyId` e `role: APPROVER` |
| 5.8 | `GET /members` | — | **200** com Dani e Bruno |
| 5.9 | `PATCH /members/:brunoId/limit` | `{"approvalLimitCents":"100000000"}` | **200** |
| 5.10 | `POST /invites` + aceite | Ana e Carla como `REQUESTER` | **201** cada |
| 5.11 | `DELETE /invites/:id` de um pendente | — | **200** `status: REVOKED`, e o link para de funcionar |

### Regras de membro

| # | Ação | Esperado |
|---|---|---|
| 5.12 | `PATCH /members/:daniId/role` para `REQUESTER` | **409** último Admin Financeiro (RN03) |
| 5.13 | `PATCH /members/:daniId/manager` apontando para ela mesma | **400** |
| 5.14 | `GET /members/:daniId/responsibilities` | **200** listando o Centro de Custo que ela gerencia |
| 5.15 | `DELETE /members/:daniId` | **409** com `details` listando as responsabilidades (RF25) |
| 5.16 | `PATCH /members/me/substitute` como Bruno | **200** com período de ausência |

---

## Fase 6 — Ciclo do pedido

Tudo como **Ana**, salvo indicação.

| # | Rota | Corpo | Esperado |
|---|---|---|---|
| 6.1 | `POST /purchase-requests` | `{"costCenterId":"...","title":"Notebooks","supplierId":"..."}` | **201** `status: DRAFT`, número `REQ-2026-0001` |
| 6.2 | `POST /purchase-requests/:id/submit` | `{}` | **400** pedido vazio — não tem item |
| 6.3 | `POST /purchase-requests/:id/items` | `{"description":"Notebook i7","quantity":"2.000","unit":"un","unitPriceCents":"850000"}` | **201** |
| 6.4 | `GET /purchase-requests/:id` | — | `totalAmountCents: "1700000"` recalculado sozinho |
| 6.5 | `PATCH /purchase-requests/:id/items/:itemId` | `{"quantity":"3.000"}` | **200**, total vira `2550000` |
| 6.6 | `POST /purchase-requests/:id/files` | multipart com um PDF | **201** |
| 6.7 | `POST /purchase-requests/:id/files` | um `.exe` renomeado para `.pdf` | **400** — a detecção é por magic bytes, não pela extensão |
| 6.8 | `GET /purchase-requests/:id/files/:fileId/download` | — | **200** com URL assinada do R2 |
| 6.9 | `POST /purchase-requests/:id/extract` | `{"text":"NF 123 R$ 1.234,56 CNPJ 11.222.333/0001-81"}` | **201** `QUEUED` — ou `FAILED` explicando, se Redis/DeepSeek estiverem fora |
| 6.10 | `GET /purchase-requests/:id/extract` | — | **200** com os campos extraídos após alguns segundos |
| 6.11 | `POST /purchase-requests/:id/submit` | `{}` | **201** `status: PENDING` |
| 6.12 | `GET /purchase-requests/:id/timeline` | — | **200** com criação e submissão em ordem |

### Duplicata (RN36)

| # | Ação | Esperado |
|---|---|---|
| 6.13 | `POST /purchase-requests/:id/duplicate` no pedido acima | **201** novo rascunho com os itens copiados |
| 6.14 | submeter o duplicado sem `confirmDuplicate` | **400** listando os pedidos parecidos |
| 6.15 | submeter com `{"confirmDuplicate":true}` | **201** |

---

## Fase 7 — Decisão e orçamento

| # | Persona | Rota | Corpo | Esperado |
|---|---|---|---|---|
| 7.1 | Ana | `POST /purchase-requests/:id/decisions` | `{"type":"APPROVED"}` | **403** — solicitante não aprova o próprio pedido (RN23) |
| 7.2 | Bruno | `GET /purchase-requests?view=PENDING_FOR_ME` | — | **200** com o pedido na lista |
| 7.3 | Bruno | `POST /purchase-requests/:id/decisions` | `{"type":"REJECTED"}` | **400** justificativa obrigatória (RN44) |
| 7.4 | Bruno | `POST /purchase-requests/:id/decisions` | `{"type":"REJECTED","justification":"curto"}` | **400** mínimo de 10 caracteres |
| 7.5 | Bruno | `POST /purchase-requests/:id/decisions` | `{"type":"APPROVED"}` | **201** `status: APPROVED` |
| 7.6 | Bruno | repita 7.5 | igual | **409** não está mais aguardando decisão |
| 7.7 | Dani | `GET /cost-centers/:id/budgets/current` | — | `committedCents` subiu exatamente o valor do pedido |
| 7.8 | Dani | `GET /budgets/:id/entries` | — | **200** com **um** lançamento `CONSUMPTION` |
| 7.9 | Dani | `GET /audit-logs?entityId=<requestId>` | — | **200** com `CREATED`, `SUBMITTED`, `APPROVED` — cada um com `actorId` e `ipAddress` preenchidos |

O **7.9** é o teste mais valioso desta fase. `actorId` nulo em ação humana é bug.

### Devolução e cancelamento

| # | Persona | Ação | Esperado |
|---|---|---|---|
| 7.10 | Bruno | decidir novo pedido com `CHANGES_REQUESTED` + justificativa | **201** `status: CHANGES_REQUESTED` |
| 7.11 | Ana | editar e submeter de novo | **201** volta a `PENDING` e o Bruno é notificado outra vez |
| 7.12 | Ana | `POST /purchase-requests/:id/cancel` `{"reason":"Compra suspensa pela diretoria"}` | **201** `CANCELED` |
| 7.13 | Ana | cancelar um pedido **já aprovado** | **403** — só Admin Financeiro reverte (RN41) |
| 7.14 | Dani | cancelar o aprovado | **201** + lançamento `REVERSAL` no orçamento |
| 7.15 | Dani | `POST /purchase-requests/:id/reassign` `{"toMemberId":"<Ana>"}` | **400** destino sem perfil de aprovação (RN33) |

---

## Fase 8 — Aprovação por e-mail

Precisa do plano Profissional (o trial já dá) e de um pedido **PENDING**.

| # | Ação | Esperado |
|---|---|---|
| 8.1 | Pegue o link `/aprovacoes/<token>` no log do e-mail enviado ao Bruno | dois botões, Aprovar e Rejeitar |
| 8.2 | `GET /email-approvals/:token` **sem login** | **200** com número, valor, solicitante, `actionable: true` |
| 8.3 | repita 8.2 três vezes | continua **200** — abrir não consome o token |
| 8.4 | `POST /email-approvals/:token` `{"type":"REJECTED","justification":"curto"}` | **400** — e o link **continua válido** |
| 8.5 | `POST /email-approvals/:token` `{"type":"APPROVED"}` | **201** `status: APPROVED` |
| 8.6 | repita 8.5 | **409** link de uso único (RN28) |
| 8.7 | `GET /email-approvals/:token` | **200** com `actionable:false` e `reason: "O pedido REQ-... já foi aprovado."` — **não** 404 |
| 8.8 | Em outro pedido: cancele e só depois abra o link | `actionable:false` (RN40) |

O **8.7** é critério de aceite: link de pedido decidido mostra estado, não erro.

---

## Fase 9 — Notificações

| # | Persona | Rota | Esperado |
|---|---|---|---|
| 9.1 | Bruno | `GET /notifications` | **200** com `REQUEST_PENDING` dos pedidos que caíram nele |
| 9.2 | Bruno | `GET /notifications/unread-count` | **200** `{"unread": N}` |
| 9.3 | Ana | `GET /notifications` | `DECISION_MADE` e `REQUEST_RETURNED` dos pedidos dela |
| 9.4 | Bruno | `PATCH /notifications/:id/read` | **204**, contador cai 1 |
| 9.5 | Bruno | repita 9.4 | **204** de novo — é idempotente |
| 9.6 | Bruno | `PATCH /notifications/:id/read` com id da Ana | **404** |
| 9.7 | Bruno | `PATCH /notifications/read-all` | **200**, contador zera |
| 9.8 | Bruno | `GET /notifications/preferences` | **200** com os **8 eventos**, todos `emailEnabled: true` |
| 9.9 | Bruno | `PATCH /notifications/preferences` desligando `REQUEST_PENDING` | **200** — o próximo pedido gera notificação na central, mas **não** manda e-mail |

Confirme 9.9 no banco:
`SELECT event, sent_by_email FROM notifications ORDER BY created_at DESC LIMIT 3;`

---

## Fase 10 — Métricas e exportação

| # | Persona | Rota | Esperado |
|---|---|---|---|
| 10.1 | Dani | `GET /analytics/dashboard` | **200** com `totals`, `consumption`, `approvers`, `costCenters`, `bottlenecks`, `repeated` |
| 10.2 | Dani | conferir `totals` | bate com o que você criou nas fases 6–7 |
| 10.3 | Dani | conferir `consumption` | `usagePercent` bate com `committed/budget` |
| 10.4 | Dani | conferir `approvers` | Bruno aparece com `averageHours` > 0 |
| 10.5 | Bruno | `GET /analytics/dashboard` | **403** — só Admin Financeiro |
| 10.6 | Dani | `GET /analytics/exports/requests?format=csv` | arquivo CSV, abre no Excel sem quebrar acento |
| 10.7 | — | abra o CSV | valores em **reais** (`25000,00`), não centavos |
| 10.8 | Dani | `GET /analytics/exports/requests?format=xlsx` | arquivo abre no Excel, coluna de valor é **número**, não texto |
| 10.9 | Carla | `GET /analytics/exports/requests?format=csv` | **só o cabeçalho** — ela não tem pedido nenhum (RN43) |

O **10.9** é o teste de visibilidade da exportação. Se vier o pedido da Ana, é vazamento.

---

## Fase 11 — Limites de plano

| # | Ação | Esperado |
|---|---|---|
| 11.1 | `GET /billing/plans` | **200** com Essencial, Profissional, Corporativo |
| 11.2 | `GET /billing/subscription` | `usedSeats` = membros ativos + convites pendentes |
| 11.3 | No banco: `UPDATE plans SET max_members = 4 WHERE tier = 'PROFESSIONAL';` | — |
| 11.4 | `POST /invites` com a empresa já em 4 vagas | **403** "O plano contratado permite 4 membro(s)…" (RN49) |
| 11.5 | Desative um membro e tente de novo | **201** |

---

## Fase 12 — Plataforma (SuperAdmin)

Promova alguém: `UPDATE users SET is_super_admin = true WHERE email = 'root@teste.com';`
e faça login de novo (a flag entra no token).

| # | Persona | Rota | Esperado |
|---|---|---|---|
| 12.1 | Root | `GET /platform/organizations` | **200** paginado, com plano e vagas de cada empresa |
| 12.2 | Root | `GET /platform/plans` | **200** |
| 12.3 | Root | `POST /platform/organizations/:companyId/plan` `{"planId":"<Essencial>"}` | **201** — a anterior é encerrada (RN48) |
| 12.4 | Dani | `GET /billing/subscription` | reflete o plano novo |
| 12.5 | Root | `POST /platform/organizations/:companyId/feature-overrides` `{"features":["ai-extraction"],"expiresAt":"2027-01-01T00:00:00Z"}` | **201** |
| 12.6 | Dani | `POST /purchase-requests/:id/extract` | funciona mesmo no Essencial (RN51) |
| 12.7 | Root | **`GET /purchase-requests/<id>`** | **403** — critério de aceite da 8.4 |
| 12.8 | Root | `GET /members` | **403** |
| 12.9 | Dani | `GET /platform/organizations` | **403** |

---

## Fase 13 — Agendador

Os crons rodam a cada 15 min (SLA), 1× por dia (tokens, convites) e 1× por mês
(orçamento, relatório). **Não espere.** Force pelo banco.

### Lembrete e escalonamento de SLA

```sql
-- joga o prazo para trás num pedido PENDING
UPDATE approval_steps
   SET reminder_due_at = NOW() - INTERVAL '1 hour'
 WHERE status = 'WAITING';
```

Aguarde o próximo múltiplo de 15 min ou reinicie a API. Confira:

| # | Verificação | Esperado |
|---|---|---|
| 13.1 | `SELECT reminder_due_at FROM approval_steps WHERE ...` | virou `NULL` — a etapa saiu da varredura |
| 13.2 | `GET /notifications` como Bruno | apareceu `SLA_REMINDER` |
| 13.3 | Repita a varredura | **não** duplica a notificação |

```sql
-- agora o escalonamento; o Bruno precisa ter manager_id definido
UPDATE approval_steps
   SET escalation_due_at = NOW() - INTERVAL '1 hour'
 WHERE status = 'WAITING';
```

| # | Verificação | Esperado |
|---|---|---|
| 13.4 | `SELECT expected_approver_id, escalated_from_id FROM approval_steps` | aprovador virou o superior; `escalated_from_id` guarda o Bruno |
| 13.5 | `GET /audit-logs?eventType=ESCALATED` | **200** com `actorId: null` (agendador, não pessoa) |
| 13.6 | Rodar de novo | não escalona a mesma etapa duas vezes |

### Virada de orçamento e relatório mensal

Dependem de datas de mês anterior. O caminho honesto é chamar os use cases
direto num script `ts-node`, ou aceitar que essa parte já foi verificada em
teste automatizado e revisar só o resultado no primeiro dia útil do mês.

### Prazo em horas úteis

Sem tocar em nada: crie um pedido numa **sexta à tarde** e confira
`escalation_due_at`. Com o padrão de 72h úteis, deve cair na **quarta**, nunca
no fim de semana.

---

## Fase 14 — Segurança e isolamento

**Esta é a fase que não pode ser pulada.** Cada linha aqui é um vazamento em
potencial.

| # | Persona | Ação | Esperado |
|---|---|---|---|
| 14.1 | Carla | `GET /purchase-requests/<id da Ana>` | **403/404** |
| 14.2 | Carla | `GET /purchase-requests` | **200** com lista **vazia** |
| 14.3 | Edu (outra empresa) | `GET /purchase-requests/<id da Ana>` | **404** — nunca 403, para não confirmar que existe |
| 14.4 | Edu | `GET /cost-centers/<id da Dani>` | **404** |
| 14.5 | Edu | `PATCH /budgets/<id da Dani>` | **404** |
| 14.6 | Ana | `PATCH /members/<brunoId>/role` | **403** — só Admin Financeiro |
| 14.7 | Ana | `PUT /approval-rules` | **403** |
| 14.8 | Ana | `GET /audit-logs` | **403** |
| 14.9 | Bruno | `GET /billing/subscription` | **403** |
| 14.10 | qualquer um | `PATCH /audit-logs/:id` ou `DELETE /audit-logs/:id` | **404** — a rota não existe, de propósito (RN45) |
| 14.11 | psql como usuário da app | `UPDATE audit_logs SET actor_id = NULL;` | **erro** do trigger append-only |

### Achado conhecido — corrija antes de subir

```
GET /api/users        → lista TODOS os usuários da plataforma
GET /api/users/:id    → qualquer usuário por id
```

Ambas exigem só estar autenticado: **sem escopo de empresa e sem restrição de
papel**. Um usuário da empresa A enumera nome e e-mail de todo mundo da empresa
B. Confirme com o Edu:

```bash
curl -s -b /tmp/edu.txt "$BASE/users" | jq 'length'
```

Se voltar mais de 1, está vazando. O `GET /members` faz o certo (escopado por
empresa) — essas duas rotas de `/users` são resquício do módulo inicial e
deveriam ser removidas ou restritas ao SuperAdmin.

---

## Armadilhas que enganam

| Sintoma | Causa provável |
|---|---|
| Tudo dá **403** depois de criar a empresa | O cookie antigo não tem `companyId`. Faça login de novo (passo 2.2) |
| `POST /purchase-requests` dá **409** | Onboarding não concluído (RN10) ou assinatura inativa (RN50) |
| Extração fica eternamente `QUEUED` | Worker não subiu, ou Redis fora. Veja o log do `NotificationsProcessor`/`ExtractionProcessor` |
| E-mail "não chega" | Sem `RESEND_API_KEY` o envio cai no **log**, com o link. É o comportamento esperado em dev |
| Aprovar dá **403** para um aprovador legítimo | Ele não gerencia o Centro de Custo. Desde o ajuste do RN43, quem foi roteado para a etapa enxerga o pedido — se ainda der 403, é bug |
| Upload de PDF recusado | Detecção por magic bytes. Arquivo renomeado não passa, e isso é proposital |
| Notificação não repete no reprocessamento | Correto: o `dedupe_key` é único |

---

## Cobertura

| Fase | Rotas exercidas |
|---|---|
| 1 | 10 de 10 do `auth` |
| 2 | 4 de 4 do `onboarding`, 3 de 4 de `companies`, 2 de 2 de `billing` |
| 3 | 6 de 10 de `cost-centers`, 5 de 5 de `approval-rules`, 4 de 6 de orçamento |
| 4 | 5 de 5 de `categories`, 7 de 7 de `suppliers` |
| 5 | 6 de 6 de `invites`, 7 de 8 de `members` |
| 6–8 | 11 de 11 de `purchase-requests`, 4 de 4 de itens, 6 de 6 de arquivos, 2 de 2 de e-mail |
| 9 | 6 de 6 de `notifications` |
| 10 | 2 de 2 de `analytics` |
| 12 | 4 de 4 de `platform` |
| 14 | `audit-logs` e as negativas de todos os módulos |

**Fora do roteiro** (rode se mexer neles): `PATCH /companies/me/policy`,
`POST /cost-centers/transfer-management`, membros de Centro de Custo,
`DELETE /users/me` (anonimização LGPD — destrói dados, faça por último e num
usuário descartável).

---

## Depois desta rodada

Este roteiro vale ser feito **uma vez inteiro**. Repetir a mão a cada mudança
não escala: são 3h por rodada, e o custo aparece justamente quando você mais
precisa mexer rápido.

As fases **6, 7 e 14** são as que quebram com mais frequência e as que mais doem
em produção. Quando virarem teste automatizado, o roteiro manual encolhe para
uma passada de 20 minutos nas telas novas.
