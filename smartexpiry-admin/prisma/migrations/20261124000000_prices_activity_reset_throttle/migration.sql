-- CreateEnum
CREATE TYPE "activity_action" AS ENUM ('STOCK_ADDED', 'STOCK_UPDATED', 'STOCK_REMOVED', 'EXPIRED_CLEARED');

-- CreateEnum
CREATE TYPE "removal_reason" AS ENUM ('SOLD', 'EXPIRED', 'DAMAGED', 'RETURNED', 'OTHER');

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "password_reset_otp_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "password_reset_otp_expires_at" TIMESTAMP(3),
ADD COLUMN     "password_reset_otp_hash" TEXT,
ADD COLUMN     "password_reset_otp_sent_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "cost_price" DECIMAL(10,2),
ADD COLUMN     "selling_price" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" "activity_action" NOT NULL,
    "reason" "removal_reason",
    "actor_admin_id" TEXT,
    "actor_employee_id" TEXT,
    "actor_name" VARCHAR(80) NOT NULL,
    "actor_label" VARCHAR(30) NOT NULL,
    "store_id" TEXT,
    "store_name" VARCHAR(120) NOT NULL,
    "product_name" VARCHAR(160) NOT NULL,
    "unit" VARCHAR(20),
    "quantity" DECIMAL(10,2),
    "details" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_throttles" (
    "key" VARCHAR(300) NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMP(3) NOT NULL,
    "locked_until" TIMESTAMP(3),

    CONSTRAINT "login_throttles_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "activity_logs_admin_id_created_at_idx" ON "activity_logs"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_admin_id_store_id_created_at_idx" ON "activity_logs"("admin_id", "store_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_actor_employee_id_created_at_idx" ON "activity_logs"("actor_employee_id", "created_at");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_admin_id_fkey" FOREIGN KEY ("actor_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_employee_id_fkey" FOREIGN KEY ("actor_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

