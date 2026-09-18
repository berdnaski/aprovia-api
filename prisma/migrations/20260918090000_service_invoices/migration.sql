-- CreateEnum
CREATE TYPE "WithholdingKind" AS ENUM ('IRRF', 'INSS', 'PIS', 'COFINS', 'CSLL', 'ISS_RETIDO');

-- CreateEnum
CREATE TYPE "ServiceInvoiceStatus" AS ENUM ('RECEIVED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "service_invoices" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "purchase_order_id" TEXT,
    "supplier_id" TEXT,
    "payable_id" TEXT,
    "access_key" VARCHAR(50) NOT NULL,
    "number" TEXT NOT NULL,
    "verification_code" TEXT,
    "municipality_code" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "issuer_cnpj" TEXT NOT NULL,
    "issuer_name" TEXT NOT NULL,
    "recipient_cnpj" TEXT NOT NULL,
    "service_description" TEXT NOT NULL,
    "service_code" TEXT,
    "gross_amount_cents" BIGINT NOT NULL,
    "discount_cents" BIGINT NOT NULL DEFAULT 0,
    "iss_rate" TEXT,
    "iss_amount_cents" BIGINT NOT NULL DEFAULT 0,
    "iss_withheld" BOOLEAN NOT NULL DEFAULT false,
    "net_amount_cents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "raw_xml" TEXT NOT NULL,
    "parse_status" "InvoiceParseStatus" NOT NULL DEFAULT 'PENDING',
    "parse_error" TEXT,
    "status" "ServiceInvoiceStatus" NOT NULL DEFAULT 'RECEIVED',
    "integrity_warnings" TEXT[],
    "uploaded_by_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rejected_by_id" TEXT,
    "rejected_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_invoice_withholdings" (
    "id" TEXT NOT NULL,
    "service_invoice_id" TEXT NOT NULL,
    "kind" "WithholdingKind" NOT NULL,
    "base_cents" BIGINT NOT NULL,
    "rate" TEXT NOT NULL,
    "amount_cents" BIGINT NOT NULL,

    CONSTRAINT "service_invoice_withholdings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_invoices_payable_id_key" ON "service_invoices"("payable_id");

-- CreateIndex
CREATE INDEX "service_invoices_company_id_status_idx" ON "service_invoices"("company_id", "status");

-- CreateIndex
CREATE INDEX "service_invoices_supplier_id_idx" ON "service_invoices"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_invoices_company_id_access_key_key" ON "service_invoices"("company_id", "access_key");

-- AddForeignKey
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_payable_id_fkey" FOREIGN KEY ("payable_id") REFERENCES "payables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "company_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_invoices" ADD CONSTRAINT "service_invoices_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_invoice_withholdings" ADD CONSTRAINT "service_invoice_withholdings_service_invoice_id_fkey" FOREIGN KEY ("service_invoice_id") REFERENCES "service_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

