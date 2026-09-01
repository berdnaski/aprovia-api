-- CreateEnum
CREATE TYPE "NfeAuthorizationStatus" AS ENUM ('UNVERIFIED', 'AUTHORIZED', 'NOT_AUTHORIZED');

-- CreateEnum
CREATE TYPE "NfeEnvironment" AS ENUM ('PRODUCTION', 'HOMOLOGATION');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "authorization_status" "NfeAuthorizationStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "environment" "NfeEnvironment",
ADD COLUMN     "integrity_warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "protocol_number" TEXT,
ADD COLUMN     "protocol_reason" TEXT,
ADD COLUMN     "protocol_received_at" TIMESTAMP(3),
ADD COLUMN     "protocol_status_code" TEXT;
