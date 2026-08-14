CREATE TYPE "PayableReleaseReason" AS ENUM ('MATCHED', 'NO_INVOICE_REQUIRED');

ALTER TABLE "payables" DROP CONSTRAINT "payables_invoice_id_fkey";

ALTER TABLE "payables" ADD COLUMN     "proof_storage_key" TEXT,
ADD COLUMN     "release_note" TEXT,
ADD COLUMN     "release_reason" "PayableReleaseReason",
ALTER COLUMN "invoice_id" DROP NOT NULL;

ALTER TABLE "payables" ADD CONSTRAINT "payables_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
