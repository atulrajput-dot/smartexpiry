-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "previous_refresh_token_hash" TEXT,
ADD COLUMN     "refresh_token_rotated_at" TIMESTAMP(3);

