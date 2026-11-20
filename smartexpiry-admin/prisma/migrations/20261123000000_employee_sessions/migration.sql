-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "previous_refresh_token_hash" TEXT,
ADD COLUMN     "refresh_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "refresh_token_hash" TEXT,
ADD COLUMN     "refresh_token_rotated_at" TIMESTAMP(3);

