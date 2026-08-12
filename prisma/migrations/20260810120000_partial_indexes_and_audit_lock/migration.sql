CREATE UNIQUE INDEX "idx_one_pending_invite_per_email"
  ON "invites" ("company_id", "email")
  WHERE "status" = 'PENDING';

CREATE UNIQUE INDEX "idx_one_active_subscription"
  ON "subscriptions" ("company_id")
  WHERE "status" IN ('ACTIVE', 'TRIALING');

CREATE UNIQUE INDEX "idx_one_consumption_per_request"
  ON "budget_entries" ("purchase_request_id")
  WHERE "type" = 'CONSUMPTION';

DROP INDEX IF EXISTS "approval_steps_status_escalation_due_at_idx";
DROP INDEX IF EXISTS "approval_steps_status_reminder_due_at_idx";

CREATE INDEX "idx_steps_pending_escalation"
  ON "approval_steps" ("escalation_due_at")
  WHERE "status" = 'WAITING';

CREATE INDEX "idx_steps_pending_reminder"
  ON "approval_steps" ("reminder_due_at")
  WHERE "status" = 'WAITING';

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
