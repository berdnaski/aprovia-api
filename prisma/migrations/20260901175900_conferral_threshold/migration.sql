-- AlterEnum
ALTER TYPE "PayableReleaseReason" ADD VALUE 'BELOW_MATCH_THRESHOLD';

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "match_required_above_cents" BIGINT;
