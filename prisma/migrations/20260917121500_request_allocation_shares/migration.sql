-- AlterTable
ALTER TABLE "request_allocations" DROP COLUMN "amount_cents",
ADD COLUMN     "share_bps" INTEGER NOT NULL;

