-- AlterTable
ALTER TABLE "feedbacks" ADD COLUMN     "screenshot_mime" TEXT,
ADD COLUMN     "screenshot_size_bytes" INTEGER,
ADD COLUMN     "screenshot_storage_key" TEXT;
