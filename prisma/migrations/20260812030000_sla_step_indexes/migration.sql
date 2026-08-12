CREATE INDEX "approval_steps_reminder_due"
  ON "approval_steps" ("reminder_due_at")
  WHERE "status" = 'WAITING' AND "reminder_due_at" IS NOT NULL;

CREATE INDEX "approval_steps_escalation_due"
  ON "approval_steps" ("escalation_due_at")
  WHERE "status" = 'WAITING' AND "escalation_due_at" IS NOT NULL;
