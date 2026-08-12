DROP TRIGGER IF EXISTS "trg_audit_logs_no_update" ON "audit_logs";
DROP TRIGGER IF EXISTS "trg_audit_logs_no_delete" ON "audit_logs";

CREATE OR REPLACE FUNCTION "audit_logs_block_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs é append-only: % não é permitido', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "audit_logs_block_update"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actor_id IS NOT NULL OR OLD.actor_id IS NULL THEN
    RAISE EXCEPTION 'audit_logs é append-only: UPDATE não é permitido'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF ROW(
      NEW.id, NEW.company_id, NEW.event_type, NEW.entity_type,
      NEW.entity_id, NEW.old_data, NEW.new_data, NEW.ip_address,
      NEW.occurred_at
    ) IS DISTINCT FROM ROW(
      OLD.id, OLD.company_id, OLD.event_type, OLD.entity_type,
      OLD.entity_id, OLD.old_data, OLD.new_data, OLD.ip_address,
      OLD.occurred_at
    )
  THEN
    RAISE EXCEPTION 'audit_logs é append-only: apenas a anonimização de actor_id é permitida'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_audit_logs_no_update"
  BEFORE UPDATE ON "audit_logs"
  FOR EACH ROW
  EXECUTE FUNCTION "audit_logs_block_update"();

CREATE TRIGGER "trg_audit_logs_no_delete"
  BEFORE DELETE ON "audit_logs"
  FOR EACH STATEMENT
  EXECUTE FUNCTION "audit_logs_block_mutation"();
