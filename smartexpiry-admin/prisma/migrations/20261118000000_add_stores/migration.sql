ALTER TABLE "admins"
ADD COLUMN "store_code_counter" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "pincode" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stores_admin_id_code_key" ON "stores"("admin_id", "code");
CREATE INDEX "stores_admin_id_created_at_idx" ON "stores"("admin_id", "created_at");

ALTER TABLE "stores"
ADD CONSTRAINT "stores_admin_id_fkey"
FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
