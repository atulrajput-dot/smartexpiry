-- CreateEnum
CREATE TYPE "employee_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "employee_code_counter" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "employee_code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "designation" VARCHAR(80) NOT NULL,
    "status" "employee_status" NOT NULL DEFAULT 'ACTIVE',
    "profile_image" BYTEA,
    "profile_image_type" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_stores" (
    "employee_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_stores_pkey" PRIMARY KEY ("employee_id","store_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "employees_admin_id_created_at_idx" ON "employees"("admin_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "employees_admin_id_employee_code_key" ON "employees"("admin_id", "employee_code");

-- CreateIndex
CREATE INDEX "employee_stores_store_id_idx" ON "employee_stores"("store_id");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_stores" ADD CONSTRAINT "employee_stores_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_stores" ADD CONSTRAINT "employee_stores_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

