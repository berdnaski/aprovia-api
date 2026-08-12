CREATE TYPE "ExtractionStatus" AS ENUM ('QUEUED', 'SUCCEEDED', 'FAILED');

CREATE TABLE "extraction_results" (
    "id" TEXT NOT NULL,
    "purchase_request_id" TEXT NOT NULL,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'QUEUED',
    "fields" JSONB,
    "failure_reason" TEXT,
    "requested_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "extraction_results_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "extraction_results_purchase_request_id_created_at_idx" ON "extraction_results"("purchase_request_id", "created_at");

ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
