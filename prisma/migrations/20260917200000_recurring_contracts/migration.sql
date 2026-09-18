-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "RecurringOccurrenceStatus" AS ENUM ('PENDING', 'MATCHED', 'SKIPPED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventType" ADD VALUE 'RECURRING_CONTRACT_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE 'RECURRING_CONTRACT_CANCELED';
ALTER TYPE "AuditEventType" ADD VALUE 'RECURRING_OCCURRENCE_GENERATED';
ALTER TYPE "AuditEventType" ADD VALUE 'RECURRING_OCCURRENCE_MATCHED';

-- AlterEnum
ALTER TYPE "PayableReleaseReason" ADD VALUE 'RECURRING_CONTRACT';

-- CreateTable
CREATE TABLE "recurring_contracts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "source_request_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "cost_center_id" TEXT NOT NULL,
    "category_id" TEXT,
    "chart_account_id" TEXT,
    "title" TEXT NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "start_date" DATE NOT NULL,
    "next_occurrence_date" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "canceled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_contract_occurrences" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "expected_amount_cents" BIGINT NOT NULL,
    "status" "RecurringOccurrenceStatus" NOT NULL DEFAULT 'PENDING',
    "budget_entry_id" TEXT,
    "invoice_id" TEXT,
    "payable_id" TEXT,
    "override_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matched_at" TIMESTAMP(3),

    CONSTRAINT "recurring_contract_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recurring_contracts_source_request_id_key" ON "recurring_contracts"("source_request_id");

-- CreateIndex
CREATE INDEX "recurring_contracts_company_id_active_idx" ON "recurring_contracts"("company_id", "active");

-- CreateIndex
CREATE INDEX "recurring_contracts_next_occurrence_date_idx" ON "recurring_contracts"("next_occurrence_date");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_contract_occurrences_invoice_id_key" ON "recurring_contract_occurrences"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_contract_occurrences_payable_id_key" ON "recurring_contract_occurrences"("payable_id");

-- CreateIndex
CREATE INDEX "recurring_contract_occurrences_contract_id_status_idx" ON "recurring_contract_occurrences"("contract_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_contract_occurrences_contract_id_period_start_key" ON "recurring_contract_occurrences"("contract_id", "period_start");

-- AddForeignKey
ALTER TABLE "recurring_contracts" ADD CONSTRAINT "recurring_contracts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_contracts" ADD CONSTRAINT "recurring_contracts_source_request_id_fkey" FOREIGN KEY ("source_request_id") REFERENCES "purchase_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_contracts" ADD CONSTRAINT "recurring_contracts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_contracts" ADD CONSTRAINT "recurring_contracts_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_contracts" ADD CONSTRAINT "recurring_contracts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_contracts" ADD CONSTRAINT "recurring_contracts_chart_account_id_fkey" FOREIGN KEY ("chart_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_contracts" ADD CONSTRAINT "recurring_contracts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "company_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_contract_occurrences" ADD CONSTRAINT "recurring_contract_occurrences_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "recurring_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_contract_occurrences" ADD CONSTRAINT "recurring_contract_occurrences_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_contract_occurrences" ADD CONSTRAINT "recurring_contract_occurrences_payable_id_fkey" FOREIGN KEY ("payable_id") REFERENCES "payables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

