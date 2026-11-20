-- CreateEnum
CREATE TYPE "product_type" AS ENUM ('PERISHABLE', 'NON_PERISHABLE');

-- CreateEnum
CREATE TYPE "product_source" AS ENUM ('MANUAL', 'BARCODE_LOOKUP');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "barcode" VARCHAR(32),
    "brand" VARCHAR(120),
    "category" VARCHAR(60) NOT NULL,
    "description" VARCHAR(1000),
    "image_url" VARCHAR(500),
    "product_type" "product_type" NOT NULL DEFAULT 'PERISHABLE',
    "unit" VARCHAR(20) NOT NULL,
    "package_size" VARCHAR(40),
    "ingredients" VARCHAR(2000),
    "storage_info" VARCHAR(300),
    "tracks_expiry" BOOLEAN NOT NULL DEFAULT true,
    "source" "product_source" NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_batches" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "batch_number" VARCHAR(40),
    "quantity_received" DECIMAL(10,2) NOT NULL,
    "quantity_remaining" DECIMAL(10,2) NOT NULL,
    "manufacturing_date" DATE,
    "expiry_date" DATE,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_admin_id" TEXT,
    "created_by_employee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_admin_id_name_idx" ON "products"("admin_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_admin_id_barcode_key" ON "products"("admin_id", "barcode");

-- CreateIndex
CREATE INDEX "inventory_batches_store_id_expiry_date_idx" ON "inventory_batches"("store_id", "expiry_date");

-- CreateIndex
CREATE INDEX "inventory_batches_product_id_idx" ON "inventory_batches"("product_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_created_by_employee_id_fkey" FOREIGN KEY ("created_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

