-- Constraints que o Prisma não expressa no schema.
-- Concorrência não quebra o que o banco garante.

-- ─────────────────────────────────────────────────────────────
-- RN04 — um único convite PENDENTE por e-mail/empresa.
-- Índice parcial preserva o histórico de expirados e revogados.
-- ─────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "idx_one_pending_invite_per_email"
  ON "invites" ("company_id", "email")
  WHERE "status" = 'PENDING';

-- ─────────────────────────────────────────────────────────────
-- RN48 — uma única assinatura ativa por empresa.
-- ─────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "idx_one_active_subscription"
  ON "subscriptions" ("company_id")
  WHERE "status" IN ('ACTIVE', 'TRIALING');

-- ─────────────────────────────────────────────────────────────
-- RN17 / RNF17 — idempotência do débito de saldo.
-- Impede que clique duplo ou reentrega de fila gere dois
-- CONSUMPTION para o mesmo pedido. Checagem na aplicação teria
-- janela de corrida; aqui não tem.
-- REVERSAL não entra: um pedido pode ser revertido mais de uma vez.
-- ─────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "idx_one_consumption_per_request"
  ON "budget_entries" ("purchase_request_id")
  WHERE "type" = 'CONSUMPTION';

-- ─────────────────────────────────────────────────────────────
-- Job de SLA (RF66, RF67) — varre só as etapas aguardando decisão.
-- Índice parcial em vez do total: a tabela cresce indefinidamente,
-- mas WAITING é sempre uma fração pequena.
-- ─────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS "approval_steps_status_escalation_due_at_idx";
DROP INDEX IF EXISTS "approval_steps_status_reminder_due_at_idx";

CREATE INDEX "idx_steps_pending_escalation"
  ON "approval_steps" ("escalation_due_at")
  WHERE "status" = 'WAITING';

CREATE INDEX "idx_steps_pending_reminder"
  ON "approval_steps" ("reminder_due_at")
  WHERE "status" = 'WAITING';

-- ─────────────────────────────────────────────────────────────
-- RN45 / RNF25 — trilha de auditoria é append-only.
-- Trigger em vez de REVOKE: o owner do banco ignora GRANT/REVOKE,
-- e em desenvolvimento a aplicação costuma conectar como owner.
-- O trigger vale para qualquer role.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "audit_logs_block_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs é append-only: % não é permitido', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_audit_logs_no_update"
  BEFORE UPDATE ON "audit_logs"
  FOR EACH STATEMENT
  EXECUTE FUNCTION "audit_logs_block_mutation"();

CREATE TRIGGER "trg_audit_logs_no_delete"
  BEFORE DELETE ON "audit_logs"
  FOR EACH STATEMENT
  EXECUTE FUNCTION "audit_logs_block_mutation"();
