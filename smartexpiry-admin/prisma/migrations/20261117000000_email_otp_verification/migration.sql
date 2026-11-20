-- DropIndex
DROP INDEX "admins_verification_token_hash_key";

-- AlterTable
ALTER TABLE "admins" DROP COLUMN "verification_sent_at",
DROP COLUMN "verification_token_expires_at",
DROP COLUMN "verification_token_hash",
ADD COLUMN     "email_otp_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "email_otp_expires_at" TIMESTAMP(3),
ADD COLUMN     "email_otp_hash" TEXT,
ADD COLUMN     "email_otp_sent_at" TIMESTAMP(3);

