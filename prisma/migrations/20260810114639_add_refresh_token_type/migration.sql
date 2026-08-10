-- AlterEnum
ALTER TYPE "TokenType" ADD VALUE 'REFRESH_TOKEN';

-- CreateIndex
CREATE INDEX "approval_steps_status_escalation_due_at_idx" ON "approval_steps"("status", "escalation_due_at");

-- CreateIndex
CREATE INDEX "approval_steps_status_reminder_due_at_idx" ON "approval_steps"("status", "reminder_due_at");
