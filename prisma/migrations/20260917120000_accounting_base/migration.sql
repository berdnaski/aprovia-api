-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('MEI', 'SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'LUCRO_ARBITRADO', 'IMMUNE_OR_EXEMPT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TaxRegimeSource" AS ENUM ('RECEITA', 'MANUAL');

-- CreateEnum
CREATE TYPE "ChartAccountKind" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COST', 'EXPENSE');

-- CreateEnum
CREATE TYPE "BankAccountStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('CHECKING', 'SAVINGS', 'PAYMENT');

-- CreateEnum
CREATE TYPE "PixKeyType" AS ENUM ('CNPJ', 'CPF', 'EMAIL', 'PHONE', 'RANDOM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventType" ADD VALUE 'ACCOUNTS_CHANGED';
ALTER TYPE "AuditEventType" ADD VALUE 'ALLOCATIONS_CHANGED';
ALTER TYPE "AuditEventType" ADD VALUE 'SUPPLIER_CHANGED';
ALTER TYPE "AuditEventType" ADD VALUE 'BANK_ACCOUNT_REQUESTED';
ALTER TYPE "AuditEventType" ADD VALUE 'BANK_ACCOUNT_APPROVED';
ALTER TYPE "AuditEventType" ADD VALUE 'BANK_ACCOUNT_REJECTED';
ALTER TYPE "AuditEventType" ADD VALUE 'BANK_ACCOUNT_ARCHIVED';
ALTER TYPE "AuditEventType" ADD VALUE 'BUDGET_DOCUMENT_ADDED';

-- AlterEnum
ALTER TYPE "FileType" ADD VALUE 'BUDGET_DOCUMENT';

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "default_account_id" TEXT;

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "budget_id" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "sha256" CHAR(64);

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "company_size" TEXT,
ADD COLUMN     "legal_nature" TEXT,
ADD COLUMN     "main_activity_code" CHAR(7),
ADD COLUMN     "main_activity_description" TEXT,
ADD COLUMN     "mei_opted" BOOLEAN,
ADD COLUMN     "municipal_registration" TEXT,
ADD COLUMN     "opened_on" DATE,
ADD COLUMN     "partners" JSONB,
ADD COLUMN     "share_capital_cents" BIGINT,
ADD COLUMN     "simples_opted" BOOLEAN,
ADD COLUMN     "state_registration" TEXT,
ADD COLUMN     "tax_regime" "TaxRegime" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "tax_regime_source" "TaxRegimeSource";

-- CreateTable
CREATE TABLE "chart_accounts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ChartAccountKind" NOT NULL,
    "postable" BOOLEAN NOT NULL DEFAULT true,
    "external_code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_allocations" (
    "id" TEXT NOT NULL,
    "purchase_request_id" TEXT NOT NULL,
    "cost_center_id" TEXT NOT NULL,
    "chart_account_id" TEXT,
    "amount_cents" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payable_allocations" (
    "id" TEXT NOT NULL,
    "payable_id" TEXT NOT NULL,
    "cost_center_id" TEXT NOT NULL,
    "chart_account_id" TEXT,
    "amount_cents" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payable_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_bank_accounts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "bank_code" CHAR(3) NOT NULL,
    "branch" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_digit" TEXT,
    "account_type" "BankAccountType" NOT NULL,
    "holder_name" TEXT NOT NULL,
    "holder_document" VARCHAR(14) NOT NULL,
    "pix_key_type" "PixKeyType",
    "pix_key" TEXT,
    "third_party" BOOLEAN NOT NULL DEFAULT false,
    "justification" TEXT,
    "status" "BankAccountStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_id" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chart_accounts_company_id_active_idx" ON "chart_accounts"("company_id", "active");

-- CreateIndex
CREATE INDEX "chart_accounts_parent_id_idx" ON "chart_accounts"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "chart_accounts_company_id_code_key" ON "chart_accounts"("company_id", "code");

-- CreateIndex
CREATE INDEX "request_allocations_purchase_request_id_idx" ON "request_allocations"("purchase_request_id");

-- CreateIndex
CREATE INDEX "request_allocations_cost_center_id_idx" ON "request_allocations"("cost_center_id");

-- CreateIndex
CREATE INDEX "request_allocations_chart_account_id_idx" ON "request_allocations"("chart_account_id");

-- CreateIndex
CREATE INDEX "payable_allocations_payable_id_idx" ON "payable_allocations"("payable_id");

-- CreateIndex
CREATE INDEX "payable_allocations_cost_center_id_idx" ON "payable_allocations"("cost_center_id");

-- CreateIndex
CREATE INDEX "payable_allocations_chart_account_id_idx" ON "payable_allocations"("chart_account_id");

-- CreateIndex
CREATE INDEX "supplier_bank_accounts_company_id_status_idx" ON "supplier_bank_accounts"("company_id", "status");

-- CreateIndex
CREATE INDEX "supplier_bank_accounts_supplier_id_status_idx" ON "supplier_bank_accounts"("supplier_id", "status");

-- CreateIndex
CREATE INDEX "files_budget_id_idx" ON "files"("budget_id");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_default_account_id_fkey" FOREIGN KEY ("default_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_accounts" ADD CONSTRAINT "chart_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_accounts" ADD CONSTRAINT "chart_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_allocations" ADD CONSTRAINT "request_allocations_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_allocations" ADD CONSTRAINT "request_allocations_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_allocations" ADD CONSTRAINT "request_allocations_chart_account_id_fkey" FOREIGN KEY ("chart_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payable_allocations" ADD CONSTRAINT "payable_allocations_payable_id_fkey" FOREIGN KEY ("payable_id") REFERENCES "payables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payable_allocations" ADD CONSTRAINT "payable_allocations_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payable_allocations" ADD CONSTRAINT "payable_allocations_chart_account_id_fkey" FOREIGN KEY ("chart_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bank_accounts" ADD CONSTRAINT "supplier_bank_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bank_accounts" ADD CONSTRAINT "supplier_bank_accounts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bank_accounts" ADD CONSTRAINT "supplier_bank_accounts_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "company_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bank_accounts" ADD CONSTRAINT "supplier_bank_accounts_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

