# Ciclo Pós-Aprovação (B1–B4)

Modelagem das quatro features que fecham o ciclo de compras: ordem de compra, recebimento, nota fiscal e conferência tripla.

Hoje o fluxo termina em `APPROVED`. A partir daí não existe nada: o fornecedor não recebe documento, ninguém registra o que chegou, e a nota fiscal não é conferida contra o que foi pedido. Este documento define o que preencher esse vazio.

---

## 1. Visão geral

```
PurchaseRequest (APPROVED)
        │
        ▼
   PurchaseOrder ──────────┐
        │                  │
        ▼                  ▼
     Receipt            Invoice
        │                  │
        └────────┬─────────┘
                 ▼
             MatchResult
                 │
                 ▼
             Payable
```

**A regra central:** `Payable` só é liberado quando o `MatchResult` fecha. Essa é a razão de existir das outras três tabelas.

---

## 2. Decisões de modelagem

Antes das tabelas, as escolhas que atravessam tudo.

### 2.1 A PO tira um retrato do pedido

`PurchaseOrderItem` copia descrição, quantidade e preço do `RequestItem` no momento da emissão. Não é referência viva.

**Por quê:** o mesmo motivo da RN22 (rota congelada). A PO é o documento que foi enviado ao fornecedor — se o pedido for editado depois, o que o fornecedor recebeu não muda. Sem a cópia, uma correção retroativa no pedido reescreveria o histórico de um documento já externo.

### 2.2 Quantidade em Decimal, dinheiro em BigInt centavos

Mantém o padrão do `RequestItem`: `Decimal(12,3)` para quantidade (permite 2,5 kg), `BigInt` para valores (RNF23).

### 2.3 Recebimento é sempre parcial por natureza

Não existe flag "recebido". Existem N `ReceiptItem` somando quantidade por item da PO. O saldo pendente é `po_item.quantity - SUM(receipt_items.quantity)`.

**Por quê:** tratar recebimento total como caso especial cria dois caminhos de código para a mesma coisa. Recebimento total é apenas o caso em que o saldo chegou a zero.

### 2.4 A nota fiscal guarda o XML original

`Invoice.raw_xml` preserva o arquivo como recebido, além dos campos extraídos.

**Por quê:** a NFe é documento fiscal com validade legal. Os campos extraídos servem à conferência; o XML serve à auditoria e permite reprocessar se o parser evoluir.

### 2.5 O match é registro, não cálculo em tempo real

`MatchResult` grava o veredito com os valores comparados no momento. Não recalcula a cada leitura.

**Por quê:** o mesmo princípio da RN47 (contexto financeiro congelado na decisão). Quem liberou um pagamento com 3% de divergência precisa poder provar qual era a tolerância naquele dia — não a de hoje.

### 2.6 Divergência não bloqueia: abre exceção

Match reprovado não trava o processo em silêncio. Gera um `MatchResult` com status `DIVERGENT` e as diferenças detalhadas, que alguém com alçada resolve — aprovando a exceção com justificativa ou rejeitando a nota.

**Por quê:** divergência de centavos é rotina (arredondamento, frete). Bloqueio absoluto faz o time contornar o sistema por fora, que é pior que não ter sistema.

### 2.7 Campo `currency` desde já

Todas as tabelas de dinheiro nascem com `currency String @default("BRL")`. Nenhuma regra usa. Existe para que multi-moeda no futuro não exija migrar dados históricos nem reinterpretar valores antigos.

### 2.8 Ingestão da nota nunca depende do fornecedor

A entrada do XML no sistema é sempre uma ação de **quem já usa o AprovAI** — nunca do fornecedor. Um fornecedor como o Canva ou a AWS não vai criar conta em nenhum portal por causa de um único cliente; portal de fornecedor só funciona quando o comprador tem poder de barganha (grande indústria obrigando a cadeia de fornecedores), o que não é o perfil do cliente-alvo.

Formas viáveis, todas operadas pelo lado do cliente:

| forma | quem age | esforço de implementação |
|---|---|---|
| **Upload manual** | Financeiro sobe o arquivo na tela | baixo — é o que entra no MVP |
| **E-mail dedicado** | Financeiro configura um encaminhamento (1 vez); o fornecedor continua mandando para o e-mail de sempre | médio — IMAP ou inbound parse de provedor |
| **SEFAZ (distribuição de DFe)** | roda sozinho, sem ação humana recorrente | alto — exige certificado digital A1 do cliente |

Portal do fornecedor está fora do roadmap por essa razão, não por falta de utilidade em tese.

### 2.9 Nem toda compra tem nota conferível

Compra de serviço no exterior ou SaaS estrangeiro (Canva, AWS, Figma) não gera NFe — chega como invoice em PDF, outra moeda, sem chave de acesso. Serviço nacional gera NFS-e, de layout municipal, fora do escopo do parser.

Se o ciclo exigir nota para fechar, esses pedidos ficam presos para sempre na fila de pendências. Por isso o `Payable` precisa de uma segunda porta de saída além do match: **liberação sem nota conferível**, com comprovante anexado (PDF, recibo) e um responsável assumindo a liberação manualmente. Ver RN65 e RN66.

---

## 3. Tabelas

### 3.1 `purchase_orders` (B1)

| campo | tipo | nota |
|---|---|---|
| `id` | uuid | |
| `number` | string | `PO-2026-0001`, único por empresa |
| `company_id` | uuid | |
| `purchase_request_id` | uuid | único — um pedido gera uma PO |
| `supplier_id` | uuid | copiado do pedido |
| `status` | enum | ver abaixo |
| `total_amount_cents` | BigInt | soma dos itens |
| `currency` | string | default `BRL` |
| `issued_by_id` | uuid | quem emitiu |
| `issued_at` | datetime | |
| `expected_delivery_at` | datetime? | prazo acordado |
| `sent_to_supplier_at` | datetime? | quando o fornecedor foi notificado |
| `delivery_address` | text? | onde entregar |
| `payment_terms` | string? | copiado do pedido |
| `notes` | text? | |
| `canceled_at` / `cancel_reason` | | |

**Enum `PurchaseOrderStatus`:** `DRAFT` · `ISSUED` · `SENT` · `PARTIALLY_RECEIVED` · `RECEIVED` · `CLOSED` · `CANCELED`

Índices: `@@unique([company_id, number])`, `@@unique([purchase_request_id])`, `@@index([company_id, status])`, `@@index([supplier_id, issued_at])`

---

### 3.2 `purchase_order_items` (B1)

| campo | tipo | nota |
|---|---|---|
| `id` | uuid | |
| `purchase_order_id` | uuid | |
| `request_item_id` | uuid? | origem, apenas para rastreio |
| `description` | string | **copiado** |
| `quantity` | Decimal(12,3) | **copiado** |
| `unit` | string | **copiado** |
| `unit_price_cents` | BigInt | **copiado** |
| `total_cents` | BigInt | **copiado** |
| `received_quantity` | Decimal(12,3) | acumulado, default 0 |
| `ncm` | string? | classificação fiscal, ajuda o match com a NF |

---

### 3.3 `receipts` (B2)

| campo | tipo | nota |
|---|---|---|
| `id` | uuid | |
| `number` | string | `REC-2026-0001` |
| `company_id` / `purchase_order_id` | uuid | |
| `received_by_id` | uuid | quem conferiu fisicamente |
| `received_at` | datetime | |
| `status` | enum | `PARTIAL` · `COMPLETE` · `REJECTED` |
| `notes` | text? | |
| `has_divergence` | boolean | quantidade ou qualidade fora do esperado |

Uma PO tem N recebimentos (entregas parceladas).

---

### 3.4 `receipt_items` (B2)

| campo | tipo | nota |
|---|---|---|
| `id` | uuid | |
| `receipt_id` / `purchase_order_item_id` | uuid | |
| `quantity` | Decimal(12,3) | quanto chegou nesta entrega |
| `rejected_quantity` | Decimal(12,3) | chegou mas foi recusado |
| `rejection_reason` | string? | |

**Regra:** `SUM(quantity)` por item da PO nunca pode exceder a quantidade pedida. Exige `SELECT ... FOR UPDATE` no item da PO — mesmo padrão da RN03.

---

### 3.5 `invoices` (B3)

| campo | tipo | nota |
|---|---|---|
| `id` | uuid | |
| `company_id` | uuid | |
| `purchase_order_id` | uuid? | pode chegar antes de ser amarrada |
| `supplier_id` | uuid? | resolvido pelo CNPJ do emitente |
| `access_key` | char(44) | chave da NFe, única por empresa |
| `number` / `series` | string | |
| `issued_at` | datetime | data de emissão |
| `issuer_cnpj` | char(14) | |
| `issuer_name` | string | |
| `recipient_cnpj` | char(14) | tem que bater com o CNPJ da empresa |
| `total_amount_cents` | BigInt | valor total da nota |
| `products_amount_cents` | BigInt | valor dos produtos |
| `freight_cents` / `insurance_cents` / `discount_cents` | BigInt | |
| `currency` | string | default `BRL` |
| `raw_xml` | text | arquivo original |
| `parse_status` | enum | `PENDING` · `PARSED` · `FAILED` |
| `parse_error` | text? | |
| `status` | enum | ver abaixo |
| `uploaded_by_id` | uuid | |

**Enum `InvoiceStatus`:** `RECEIVED` · `MATCHED` · `DIVERGENT` · `APPROVED` · `REJECTED`

Índices: `@@unique([company_id, access_key])`, `@@index([company_id, status])`, `@@index([supplier_id, issued_at])`, `@@index([purchase_order_id])`

**A chave de acesso é a defesa contra duplicidade.** São 44 dígitos únicos por nota no país inteiro — mesma nota lançada duas vezes é barrada pelo índice único.

---

### 3.6 `invoice_items` (B3)

| campo | tipo | nota |
|---|---|---|
| `id` | uuid | |
| `invoice_id` | uuid | |
| `purchase_order_item_id` | uuid? | preenchido pela conciliação |
| `sequence` | int | ordem na nota |
| `description` | string | |
| `ncm` / `cfop` | string? | usados para casar com o item da PO |
| `quantity` | Decimal(12,3) | |
| `unit` | string | |
| `unit_price_cents` / `total_cents` | BigInt | |

---

### 3.7 `invoice_taxes` (B3)

Impostos destacados na nota, um registro por tipo.

| campo | tipo |
|---|---|
| `id` | uuid |
| `invoice_id` | uuid |
| `kind` | enum `ICMS` · `IPI` · `PIS` · `COFINS` · `ISS` · `IRRF` · `CSLL` · `INSS` |
| `base_cents` | BigInt |
| `rate` | Decimal(5,2) |
| `amount_cents` | BigInt |
| `withheld` | boolean — retido na fonte |

Tabela separada porque a quantidade de impostos varia por tipo de operação. Colunas fixas na `invoices` ficariam metade nulas.

---

### 3.8 `match_results` (B4)

O coração da feature.

| campo | tipo | nota |
|---|---|---|
| `id` | uuid | |
| `company_id` | uuid | |
| `purchase_order_id` / `invoice_id` | uuid | |
| `status` | enum `MATCHED` · `DIVERGENT` · `OVERRIDDEN` · `REJECTED` |
| `checked_at` | datetime | |
| `price_tolerance_percent` | Decimal(5,2) | **congelado** do que valia no momento |
| `quantity_tolerance_percent` | Decimal(5,2) | idem |
| `ordered_amount_cents` | BigInt | o que foi pedido |
| `received_amount_cents` | BigInt | o que chegou |
| `invoiced_amount_cents` | BigInt | o que foi cobrado |
| `resolved_by_id` | uuid? | quem tratou a exceção |
| `resolved_at` | datetime? | |
| `resolution_note` | text? | justificativa da liberação |

---

### 3.9 `match_divergences` (B4)

Uma linha por problema encontrado. Sem isso o match diz "não bateu" sem dizer onde.

| campo | tipo |
|---|---|
| `id` | uuid |
| `match_result_id` | uuid |
| `kind` | enum — ver abaixo |
| `purchase_order_item_id` | uuid? |
| `invoice_item_id` | uuid? |
| `expected_value` | string |
| `actual_value` | string |
| `difference_cents` | BigInt? |
| `difference_percent` | Decimal(5,2)? |

**Enum `DivergenceKind`:**

| valor | significa |
|---|---|
| `PRICE_ABOVE_ORDER` | cobraram mais caro que o combinado |
| `QUANTITY_ABOVE_RECEIVED` | faturaram mais do que chegou |
| `QUANTITY_ABOVE_ORDER` | entregaram mais do que foi pedido |
| `ITEM_NOT_IN_ORDER` | item na nota que ninguém pediu |
| `ITEM_NOT_INVOICED` | item pedido e recebido que não veio na nota |
| `SUPPLIER_MISMATCH` | CNPJ do emitente ≠ fornecedor da PO |
| `TOTAL_MISMATCH` | soma dos itens ≠ total da nota |

---

### 3.10 `payables` (B5 — mínimo)

Não estava no escopo original, mas sem ele o match não tem consequência.

| campo | tipo | nota |
|---|---|---|
| `id` | uuid | |
| `company_id` / `supplier_id` | uuid | |
| `invoice_id` | uuid? | **nullable** — ausente quando não há nota conferível (RN65) |
| `amount_cents` | BigInt | |
| `currency` | string | default `BRL` |
| `due_date` | date | |
| `status` | enum `BLOCKED` · `RELEASED` · `PAID` · `CANCELED` |
| `release_reason` | enum? | `MATCHED` · `NO_INVOICE_REQUIRED` — por que foi liberado |
| `proof_file_id` | uuid? | comprovante anexado quando liberado sem nota |
| `released_by_id` / `released_at` | | |
| `paid_at` | datetime? | |
| `barcode` | string? | linha digitável do boleto |

**Nasce sempre `BLOCKED`.** Vira `RELEASED` de duas formas: match `MATCHED`/`OVERRIDDEN` (o caminho normal), ou liberação manual por Admin Financeiro com comprovante anexado quando não há nota conferível (RN65, RN66) — caso de assinaturas e serviços do exterior.

---

### 3.11 Configuração por empresa

Campos novos em `companies`:

| campo | default | nota |
|---|---|---|
| `price_tolerance_percent` | 2.00 | divergência de preço aceita sem exceção |
| `quantity_tolerance_percent` | 0.00 | divergência de quantidade aceita |
| `requires_receipt_before_invoice` | true | exige recebimento antes de aceitar nota |
| `auto_release_on_match` | false | libera pagamento sozinho quando o match fecha |
| `po_number_prefix` | `PO` | |

---

## 4. Enums a acrescentar nos existentes

**`FileType`** — `INVOICE_XML`, `INVOICE_PDF` (DANFE), `RECEIPT_ATTACHMENT`

**`AuditEventType`** — `PO_ISSUED`, `PO_CANCELED`, `GOODS_RECEIVED`, `INVOICE_UPLOADED`, `MATCH_COMPLETED`, `MATCH_OVERRIDDEN`, `PAYABLE_RELEASED`

**`NotificationEvent`** — `PO_ISSUED`, `DELIVERY_OVERDUE`, `INVOICE_RECEIVED`, `MATCH_DIVERGENT`, `PAYABLE_DUE`

---

## 5. Regras de negócio novas

Numeradas na sequência das existentes (última é RN51).

| # | Regra |
|---|---|
| **RN52** | Só pedido `APPROVED` gera PO. Um pedido gera exatamente uma PO. |
| **RN53** | A PO copia os itens do pedido no momento da emissão. Alteração posterior no pedido não altera a PO. |
| **RN54** | Cancelar PO já recebida (mesmo parcialmente) é proibido. |
| **RN55** | A soma dos recebimentos por item nunca excede a quantidade da PO. Exige lock no item. |
| **RN56** | Nota com chave de acesso já registrada na empresa é recusada. |
| **RN57** | O CNPJ do destinatário na NFe precisa ser o da empresa. |
| **RN58** | O CNPJ do emitente precisa ser o do fornecedor da PO, salvo exceção justificada. |
| **RN59** | O match compara: preço faturado ≤ preço da PO + tolerância; quantidade faturada ≤ quantidade recebida + tolerância. |
| **RN60** | Match divergente não bloqueia em silêncio: gera exceção resolvível por quem tem alçada. |
| **RN61** | A liberação de pagamento exige match `MATCHED` ou `OVERRIDDEN`. |
| **RN62** | As tolerâncias são congeladas no `MatchResult` no momento da conferência. |
| **RN63** | Se `requires_receipt_before_invoice`, a nota só é aceita após ao menos um recebimento. |
| **RN64** | Toda liberação de exceção registra quem, quando e por quê. |
| **RN65** | Um `Payable` pode ser criado sem `invoice_id`, para pedidos aprovados sem nota fiscal conferível (serviço no exterior, SaaS). Exige comprovante anexado e justificativa. |
| **RN66** | A liberação de um `Payable` sem nota exige alçada de Admin Financeiro, nunca automática. |

---

## 6. Estrutura de código

Seguindo o padrão dos módulos existentes (`domain` / `application` / `dto` / `infrastructure`):

```
src/modules/
├── purchase-orders/
│   ├── domain/
│   │   ├── purchase-order.entity.ts
│   │   ├── purchase-order-item.entity.ts
│   │   ├── purchase-orders.errors.ts
│   │   ├── purchase-orders.repository.interface.ts
│   │   └── services/
│   │       ├── po-number.service.ts
│   │       └── po-status.service.ts
│   ├── application/
│   │   ├── issue-purchase-order.use-case.ts
│   │   ├── list-purchase-orders.use-case.ts
│   │   ├── find-purchase-order-by-id.use-case.ts
│   │   ├── send-to-supplier.use-case.ts
│   │   └── cancel-purchase-order.use-case.ts
│   ├── dto/
│   └── infrastructure/
│
├── receipts/
│   ├── domain/
│   │   ├── receipt.entity.ts
│   │   ├── receipts.errors.ts
│   │   ├── receipts.repository.interface.ts
│   │   └── services/
│   │       └── receipt-balance.service.ts
│   ├── application/
│   │   ├── register-receipt.use-case.ts
│   │   ├── list-receipts.use-case.ts
│   │   └── get-pending-balance.use-case.ts
│   ├── dto/
│   └── infrastructure/
│
├── invoices/
│   ├── domain/
│   │   ├── invoice.entity.ts
│   │   ├── invoices.errors.ts
│   │   ├── invoices.repository.interface.ts
│   │   ├── nfe-parser.interface.ts
│   │   └── services/
│   │       └── invoice-linking.service.ts
│   ├── application/
│   │   ├── upload-invoice-xml.use-case.ts
│   │   ├── link-invoice-to-order.use-case.ts
│   │   └── list-invoices.use-case.ts
│   ├── dto/
│   └── infrastructure/
│       └── nfe-xml.parser.ts
│
└── matching/
    ├── domain/
    │   ├── match-result.entity.ts
    │   ├── matching.errors.ts
    │   ├── matching.repository.interface.ts
    │   └── services/
    │       ├── three-way-match.service.ts      ← o núcleo
    │       └── item-reconciliation.service.ts
    ├── application/
    │   ├── run-match.use-case.ts
    │   ├── override-match.use-case.ts
    │   ├── reject-invoice.use-case.ts
    │   └── release-payable.use-case.ts
    ├── dto/
    └── infrastructure/
```

`three-way-match.service.ts` é função pura: recebe PO + recebimentos + nota + tolerâncias, devolve veredito e divergências. Sem I/O, testável sem banco.

---

## 7. Endpoints

**Ordens de compra**
```
POST   /purchase-requests/:id/purchase-order   emitir a partir do pedido aprovado
GET    /purchase-orders                        listar com filtros
GET    /purchase-orders/:id
POST   /purchase-orders/:id/send               enviar ao fornecedor
POST   /purchase-orders/:id/cancel
GET    /purchase-orders/:id/balance            saldo pendente por item
```

**Recebimentos**
```
POST   /purchase-orders/:id/receipts           registrar entrega
GET    /purchase-orders/:id/receipts
GET    /receipts/:id
```

**Notas fiscais**
```
POST   /invoices/upload                        multipart, XML da NFe
GET    /invoices
GET    /invoices/:id
POST   /invoices/:id/link                      amarrar a uma PO manualmente
POST   /invoices/:id/reject
```

**Conferência**
```
POST   /invoices/:id/match                     rodar a conferência
GET    /match-results/:id
POST   /match-results/:id/override             liberar exceção com justificativa
GET    /match-results?status=DIVERGENT         fila de pendências
```

**Contas a pagar**
```
GET    /payables
POST   /payables/:id/release
POST   /payables/:id/pay
```

---

## 8. Parser de NFe

O XML segue layout público da SEFAZ (`nfeProc` → `NFe` → `infNFe`). Campos relevantes:

| caminho | destino |
|---|---|
| `infNFe/@Id` | `access_key` (remove o prefixo `NFe`) |
| `ide/nNF` · `ide/serie` · `ide/dhEmi` | número, série, emissão |
| `emit/CNPJ` · `emit/xNome` | emitente |
| `dest/CNPJ` | destinatário — validar contra a empresa |
| `det[]/prod/*` | itens: `cProd`, `xProd`, `NCM`, `CFOP`, `qCom`, `vUnCom`, `vProd` |
| `det[]/imposto/*` | impostos por item |
| `total/ICMSTot/*` | totais: `vNF`, `vProd`, `vFrete`, `vDesc` |

**Cuidados:**
- valores vêm como string decimal (`"1234.56"`) — converter para centavos sem passar por float
- `qCom` aceita 4 casas decimais
- notas de serviço (NFS-e) têm layout municipal, cada cidade o seu — **fora do escopo**, só NFe de produto
- `raw_xml` guardado antes de qualquer parse, para reprocessar se o parser evoluir

Biblioteca: `fast-xml-parser` (MIT, sem dependências nativas).

---

## 9. Ordem de implementação

| # | Entrega | Depende de |
|---|---|---|
| 1 | Schema completo + migrations | — |
| 2 | PO: emissão, listagem, cancelamento | 1 |
| 3 | Recebimento com saldo e lock | 2 |
| 4 | Parser de NFe isolado, com testes | 1 |
| 5 | Upload de nota + vínculo com PO | 4 |
| 6 | Motor de match (função pura + testes) | — |
| 7 | Match integrado + exceções | 3, 5, 6 |
| 8 | Contas a pagar + liberação | 7 |
| 9 | Notificações e auditoria dos eventos novos | 8 |

Os passos 4 e 6 não dependem de banco e podem ser feitos em paralelo com o resto.

---

## 10. Fora do escopo

Registrado para não virar discussão depois:

- **Validação na SEFAZ** — exige certificado digital A1 da empresa cliente. A leitura do XML não precisa.
- **NFS-e** — layout varia por município. Serviços entram por lançamento manual.
- **Cálculo de retenção** — o sistema lê o que a nota destaca; não calcula. Calcular gera responsabilidade fiscal.
- **Multi-moeda** — campo `currency` existe, nenhuma regra usa.
- **Integração com ERP** — exportação de arquivo resolve o MVP.
- **Pagamento efetivo** — o sistema registra que foi pago; não executa transferência.
