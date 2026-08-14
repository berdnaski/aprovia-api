
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELED');

CREATE TYPE "ReceiptStatus" AS ENUM ('PARTIAL', 'COMPLETE', 'REJECTED');

CREATE TYPE "InvoiceParseStatus" AS ENUM ('PENDING', 'PARSED', 'FAILED');

CREATE TYPE "InvoiceStatus" AS ENUM ('RECEIVED', 'MATCHED', 'DIVERGENT', 'APPROVED', 'REJECTED');

CREATE TYPE "TaxKind" AS ENUM ('ICMS', 'IPI', 'PIS', 'COFINS', 'ISS', 'IRRF', 'CSLL', 'INSS');

CREATE TYPE "MatchStatus" AS ENUM ('MATCHED', 'DIVERGENT', 'OVERRIDDEN', 'REJECTED');

CREATE TYPE "DivergenceKind" AS ENUM ('PRICE_ABOVE_ORDER', 'QUANTITY_ABOVE_RECEIVED', 'QUANTITY_ABOVE_ORDER', 'ITEM_NOT_IN_ORDER', 'ITEM_NOT_INVOICED', 'SUPPLIER_MISMATCH', 'TOTAL_MISMATCH');

CREATE TYPE "PayableStatus" AS ENUM ('BLOCKED', 'RELEASED', 'PAID', 'CANCELED');

ALTER TYPE "AuditEventType" ADD VALUE 'PO_ISSUED';
ALTER TYPE "AuditEventType" ADD VALUE 'PO_SENT';
ALTER TYPE "AuditEventType" ADD VALUE 'PO_CANCELED';
ALTER TYPE "AuditEventType" ADD VALUE 'GOODS_RECEIVED';
ALTER TYPE "AuditEventType" ADD VALUE 'INVOICE_UPLOADED';
ALTER TYPE "AuditEventType" ADD VALUE 'INVOICE_REJECTED';
ALTER TYPE "AuditEventType" ADD VALUE 'MATCH_COMPLETED';
ALTER TYPE "AuditEventType" ADD VALUE 'MATCH_OVERRIDDEN';
ALTER TYPE "AuditEventType" ADD VALUE 'PAYABLE_RELEASED';
ALTER TYPE "AuditEventType" ADD VALUE 'PAYABLE_PAID';

ALTER TYPE "FileType" ADD VALUE 'INVOICE_XML';
ALTER TYPE "FileType" ADD VALUE 'INVOICE_PDF';
ALTER TYPE "FileType" ADD VALUE 'RECEIPT_ATTACHMENT';

ALTER TYPE "NotificationEvent" ADD VALUE 'PO_ISSUED';
ALTER TYPE "NotificationEvent" ADD VALUE 'DELIVERY_OVERDUE';
ALTER TYPE "NotificationEvent" ADD VALUE 'INVOICE_RECEIVED';
ALTER TYPE "NotificationEvent" ADD VALUE 'MATCH_DIVERGENT';
ALTER TYPE "NotificationEvent" ADD VALUE 'PAYABLE_DUE';

ALTER TABLE "companies" ADD COLUMN     "auto_release_on_match" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "po_number_prefix" TEXT NOT NULL DEFAULT 'PO',
ADD COLUMN     "price_tolerance_percent" DECIMAL(5,2) NOT NULL DEFAULT 2.00,
ADD COLUMN     "quantity_tolerance_percent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "requires_receipt_before_invoice" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "purchase_request_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'ISSUED',
    "total_amount_cents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "issued_by_id" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_delivery_at" TIMESTAMP(3),
    "sent_to_supplier_at" TIMESTAMP(3),
    "delivery_address" TEXT,
    "payment_terms" TEXT,
    "notes" TEXT,
    "canceled_by_id" TEXT,
    "canceled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "request_item_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price_cents" BIGINT NOT NULL,
    "total_cents" BIGINT NOT NULL,
    "received_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "ncm" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "received_by_id" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReceiptStatus" NOT NULL,
    "has_divergence" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "receipt_items" (
    "id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "purchase_order_item_id" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "rejected_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "purchase_order_id" TEXT,
    "supplier_id" TEXT,
    "access_key" CHAR(44) NOT NULL,
    "number" TEXT NOT NULL,
    "series" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "issuer_cnpj" CHAR(14) NOT NULL,
    "issuer_name" TEXT NOT NULL,
    "recipient_cnpj" CHAR(14) NOT NULL,
    "total_amount_cents" BIGINT NOT NULL,
    "products_amount_cents" BIGINT NOT NULL DEFAULT 0,
    "freight_cents" BIGINT NOT NULL DEFAULT 0,
    "insurance_cents" BIGINT NOT NULL DEFAULT 0,
    "discount_cents" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "raw_xml" TEXT NOT NULL,
    "parse_status" "InvoiceParseStatus" NOT NULL DEFAULT 'PENDING',
    "parse_error" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'RECEIVED',
    "uploaded_by_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rejected_by_id" TEXT,
    "rejected_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "purchase_order_item_id" TEXT,
    "sequence" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "ncm" TEXT,
    "cfop" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price_cents" BIGINT NOT NULL,
    "total_cents" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_taxes" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "kind" "TaxKind" NOT NULL,
    "base_cents" BIGINT NOT NULL DEFAULT 0,
    "rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "amount_cents" BIGINT NOT NULL DEFAULT 0,
    "withheld" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_taxes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "match_results" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price_tolerance_percent" DECIMAL(5,2) NOT NULL,
    "quantity_tolerance_percent" DECIMAL(5,2) NOT NULL,
    "ordered_amount_cents" BIGINT NOT NULL,
    "received_amount_cents" BIGINT NOT NULL,
    "invoiced_amount_cents" BIGINT NOT NULL,
    "resolved_by_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "match_divergences" (
    "id" TEXT NOT NULL,
    "match_result_id" TEXT NOT NULL,
    "kind" "DivergenceKind" NOT NULL,
    "purchase_order_item_id" TEXT,
    "invoice_item_id" TEXT,
    "expected_value" TEXT NOT NULL,
    "actual_value" TEXT NOT NULL,
    "difference_cents" BIGINT,
    "difference_percent" DECIMAL(7,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_divergences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payables" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "due_date" DATE NOT NULL,
    "status" "PayableStatus" NOT NULL DEFAULT 'BLOCKED',
    "released_by_id" TEXT,
    "released_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "barcode" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payables_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "purchase_orders_company_id_status_idx" ON "purchase_orders"("company_id", "status");

CREATE INDEX "purchase_orders_supplier_id_issued_at_idx" ON "purchase_orders"("supplier_id", "issued_at");

CREATE INDEX "purchase_orders_company_id_expected_delivery_at_idx" ON "purchase_orders"("company_id", "expected_delivery_at");

CREATE UNIQUE INDEX "purchase_orders_company_id_number_key" ON "purchase_orders"("company_id", "number");

CREATE UNIQUE INDEX "purchase_orders_purchase_request_id_key" ON "purchase_orders"("purchase_request_id");

CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

CREATE INDEX "receipts_purchase_order_id_received_at_idx" ON "receipts"("purchase_order_id", "received_at");

CREATE INDEX "receipts_company_id_received_at_idx" ON "receipts"("company_id", "received_at");

CREATE UNIQUE INDEX "receipts_company_id_number_key" ON "receipts"("company_id", "number");

CREATE INDEX "receipt_items_receipt_id_idx" ON "receipt_items"("receipt_id");

CREATE INDEX "receipt_items_purchase_order_item_id_idx" ON "receipt_items"("purchase_order_item_id");

CREATE INDEX "invoices_company_id_status_idx" ON "invoices"("company_id", "status");

CREATE INDEX "invoices_supplier_id_issued_at_idx" ON "invoices"("supplier_id", "issued_at");

CREATE INDEX "invoices_purchase_order_id_idx" ON "invoices"("purchase_order_id");

CREATE UNIQUE INDEX "invoices_company_id_access_key_key" ON "invoices"("company_id", "access_key");

CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

CREATE INDEX "invoice_items_purchase_order_item_id_idx" ON "invoice_items"("purchase_order_item_id");

CREATE INDEX "invoice_taxes_invoice_id_idx" ON "invoice_taxes"("invoice_id");

CREATE UNIQUE INDEX "invoice_taxes_invoice_id_kind_key" ON "invoice_taxes"("invoice_id", "kind");

CREATE INDEX "match_results_company_id_status_idx" ON "match_results"("company_id", "status");

CREATE INDEX "match_results_invoice_id_checked_at_idx" ON "match_results"("invoice_id", "checked_at");

CREATE INDEX "match_results_purchase_order_id_idx" ON "match_results"("purchase_order_id");

CREATE INDEX "match_divergences_match_result_id_idx" ON "match_divergences"("match_result_id");

CREATE INDEX "payables_company_id_status_idx" ON "payables"("company_id", "status");

CREATE INDEX "payables_company_id_due_date_idx" ON "payables"("company_id", "due_date");

CREATE INDEX "payables_supplier_id_due_date_idx" ON "payables"("supplier_id", "due_date");

CREATE UNIQUE INDEX "payables_invoice_id_key" ON "payables"("invoice_id");

ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "company_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_canceled_by_id_fkey" FOREIGN KEY ("canceled_by_id") REFERENCES "company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_request_item_id_fkey" FOREIGN KEY ("request_item_id") REFERENCES "request_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "receipts" ADD CONSTRAINT "receipts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "receipts" ADD CONSTRAINT "receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "receipts" ADD CONSTRAINT "receipts_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "company_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "company_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_taxes" ADD CONSTRAINT "invoice_taxes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_results" ADD CONSTRAINT "match_results_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_results" ADD CONSTRAINT "match_results_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "match_results" ADD CONSTRAINT "match_results_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "match_results" ADD CONSTRAINT "match_results_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "match_divergences" ADD CONSTRAINT "match_divergences_match_result_id_fkey" FOREIGN KEY ("match_result_id") REFERENCES "match_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_divergences" ADD CONSTRAINT "match_divergences_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "match_divergences" ADD CONSTRAINT "match_divergences_invoice_item_id_fkey" FOREIGN KEY ("invoice_item_id") REFERENCES "invoice_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payables" ADD CONSTRAINT "payables_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payables" ADD CONSTRAINT "payables_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payables" ADD CONSTRAINT "payables_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payables" ADD CONSTRAINT "payables_released_by_id_fkey" FOREIGN KEY ("released_by_id") REFERENCES "company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
