"use server";

import { refresh } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { parseScannedCode } from "@/lib/products/barcode";
import { describeChanges, formatDay } from "@/lib/activity/describe";
import { logActivity, type Actor } from "@/lib/activity/log";
import { isPerishableCategory, isRemovalReason, parseDateOnly, todayUtc, type RemovalReason } from "@/lib/products/catalog";
import { lookupBarcodeExternally } from "@/lib/products/lookup";
import {
  validateAddStock,
  validateUpdateStock,
  type AddStockResult,
  type DeleteStockResult,
  type LookupResult,
  type ProductPrefill,
  type UpdateStockResult,
} from "@/lib/validations/product";

const EMPTY_PREFILL: ProductPrefill = {
  barcode: null, name: null, brand: null, category: null, productType: null, unit: null, packageSize: null,
  description: null, storageInfo: null, ingredients: null, imageUrl: null, tracksExpiry: null, costPrice: null, sellingPrice: null,
  batchNumber: null, manufacturingDate: null, expiryDate: null,
};

const LABELS: Partial<Record<keyof ProductPrefill, string>> = {
  name: "name", brand: "brand", category: "category", packageSize: "package size", imageUrl: "image",
  ingredients: "ingredients", storageInfo: "storage info", unit: "unit",
  expiryDate: "expiry date", manufacturingDate: "manufacturing date", batchNumber: "batch number",
};

/* ───────────────────────────── Barcode lookup ───────────────────────────── */

/**
 * Turns a scanned/typed code into form pre-fill:
 * 1. GS1 codes → expiry, batch, manufacturing date straight from the barcode.
 * 2. Your own catalog (barcode added before) → all saved product details.
 * 3. Otherwise Open Food Facts / Open Beauty Facts → whatever they know.
 */
export async function lookupBarcodeAction(raw: string): Promise<LookupResult> {
  const admin = await requireAdmin();
  if (typeof raw !== "string" || raw.length > 200) return { ok: false, message: "That doesn't look like a barcode." };

  const scanned = parseScannedCode(raw);
  if (!scanned.gtin) {
    return { ok: false, message: "We couldn't read a product number from that code. Try again or type the barcode." };
  }

  const prefill: ProductPrefill = {
    ...EMPTY_PREFILL,
    barcode: scanned.gtin,
    expiryDate: scanned.expiryDate,
    manufacturingDate: scanned.manufacturingDate,
    batchNumber: scanned.batchNumber,
  };
  let found: Extract<LookupResult, { ok: true }>["found"] = "not_found";

  try {
    const existing = await prisma.product.findUnique({
      where: { adminId_barcode: { adminId: admin.id, barcode: scanned.gtin } },
    });
    if (existing) {
      found = "catalog";
      Object.assign(prefill, {
        name: existing.name,
        brand: existing.brand,
        category: existing.category,
        productType: existing.productType,
        unit: existing.unit,
        packageSize: existing.packageSize,
        description: existing.description,
        storageInfo: existing.storageInfo,
        ingredients: existing.ingredients,
        imageUrl: existing.imageUrl,
        tracksExpiry: existing.tracksExpiry,
        costPrice: existing.costPrice ? existing.costPrice.toString() : null,
        sellingPrice: existing.sellingPrice ? existing.sellingPrice.toString() : null,
      });
    } else {
      const external = await lookupBarcodeExternally(scanned.gtin);
      if (external) {
        found = external.source;
        Object.assign(prefill, external.product);
      }
    }
  } catch (error) {
    console.error("[product:lookup] failed", error);
    // Still useful: the barcode (and any GS1 dates) can be used with manual entry.
  }

  const filled = (Object.keys(LABELS) as (keyof ProductPrefill)[])
    .filter((k) => prefill[k] !== null && prefill[k] !== "")
    .map((k) => LABELS[k]!);

  return { ok: true, found, fromGs1: scanned.isGs1, prefill, filled };
}

/* ───────────────────────────── Add to store ───────────────────────────── */

/**
 * Adds stock of a product to one of the admin's stores.
 * The product is matched in the catalog by barcode (or, without a barcode, by
 * the same name + brand) and its details are updated from the form; otherwise
 * a new catalog product is created. Then a batch with its own quantity and
 * expiry date is recorded for the store.
 */
export async function addProductToStoreAction(formData: FormData): Promise<AddStockResult> {
  const admin = await requireAdmin();

  const parsed = validateAddStock({
    storeId: String(formData.get("storeId") ?? ""),
    barcode: String(formData.get("barcode") ?? ""),
    name: String(formData.get("name") ?? ""),
    brand: String(formData.get("brand") ?? ""),
    category: String(formData.get("category") ?? ""),
    productType: String(formData.get("productType") ?? "PERISHABLE"),
    unit: String(formData.get("unit") ?? ""),
    packageSize: String(formData.get("packageSize") ?? ""),
    description: String(formData.get("description") ?? ""),
    storageInfo: String(formData.get("storageInfo") ?? ""),
    ingredients: String(formData.get("ingredients") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    tracksExpiry: formData.get("noExpiry") !== "1",
    source: formData.get("source") === "BARCODE_LOOKUP" ? "BARCODE_LOOKUP" : "MANUAL",
    costPrice: String(formData.get("costPrice") ?? ""),
    sellingPrice: String(formData.get("sellingPrice") ?? ""),
    batchNumber: String(formData.get("batchNumber") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    manufacturingDate: String(formData.get("manufacturingDate") ?? ""),
    expiryDate: String(formData.get("expiryDate") ?? ""),
  });
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }
  const d = parsed.data;

  try {
    const store = await prisma.store.findFirst({ where: { id: d.storeId, adminId: admin.id }, select: { id: true, name: true } });
    if (!store) return { ok: false, message: "This store no longer exists. Refresh the page." };

    const details = {
      name: d.name,
      brand: d.brand,
      category: d.category,
      productType: d.productType,
      unit: d.unit,
      packageSize: d.packageSize,
      description: d.description,
      storageInfo: d.storageInfo,
      ingredients: d.ingredients,
      imageUrl: d.imageUrl,
      tracksExpiry: d.tracksExpiry,
      costPrice: d.costPrice,
      sellingPrice: d.sellingPrice,
    };

    const result = await prisma.$transaction(async (tx) => {
      const existing = d.barcode
        ? await tx.product.findUnique({ where: { adminId_barcode: { adminId: admin.id, barcode: d.barcode } }, select: { id: true } })
        : await tx.product.findFirst({
            where: {
              adminId: admin.id,
              barcode: null,
              name: { equals: d.name, mode: "insensitive" },
              brand: d.brand ? { equals: d.brand, mode: "insensitive" } : null,
            },
            select: { id: true },
          });

      const product = existing
        ? await tx.product.update({ where: { id: existing.id }, data: details, select: { id: true, name: true, unit: true } })
        : await tx.product.create({
            data: { ...details, adminId: admin.id, barcode: d.barcode, source: d.source },
            select: { id: true, name: true, unit: true },
          });

      await tx.inventoryBatch.create({
        data: {
          productId: product.id,
          storeId: store.id,
          batchNumber: d.batchNumber,
          quantityReceived: new Prisma.Decimal(d.quantity),
          quantityRemaining: new Prisma.Decimal(d.quantity),
          manufacturingDate: d.manufacturingDate ? parseDateOnly(d.manufacturingDate) : null,
          expiryDate: d.tracksExpiry && d.expiryDate ? parseDateOnly(d.expiryDate) : null,
          createdByAdminId: admin.id,
        },
      });

      await logActivity(
        actorOf(admin),
        [
          {
            adminId: admin.id,
            action: "STOCK_ADDED",
            storeId: store.id,
            storeName: store.name,
            productName: product.name,
            unit: product.unit,
            quantity: d.quantity,
            details: [d.batchNumber && `Batch ${d.batchNumber}`, d.tracksExpiry && d.expiryDate ? `Expires ${formatDay(d.expiryDate)}` : "No expiry"]
              .filter(Boolean)
              .join(" · "),
          },
        ],
        tx,
      );

      return { product, isNewProduct: !existing };
    });

    refresh(); // tiles and product lists update in the same response
    return {
      ok: true,
      productName: result.product.name,
      quantity: d.quantity,
      unit: result.product.unit,
      expiryDate: d.tracksExpiry ? d.expiryDate : null,
      isNewProduct: result.isNewProduct,
    };
  } catch (error) {
    console.error("[product:add] failed", error);
    return { ok: false, message: "We couldn't add the product. Please try again." };
  }
}

const actorOf = (admin: { id: string; name: string }): Actor => ({ kind: "admin", id: admin.id, name: admin.name });
const n = (v: { toNumber(): number } | null) => (v ? v.toNumber() : null);

/* ───────────────────────────── Edit stock ───────────────────────────── */

/**
 * Updates one stock batch (quantity, batch number, dates) and the catalog
 * details of its product (name, brand, category, unit, prices). Product
 * details are shared, so they change in every store that stocks the product.
 */
export async function updateStockAction(formData: FormData): Promise<UpdateStockResult> {
  const admin = await requireAdmin();

  const parsed = validateUpdateStock({
    batchId: String(formData.get("batchId") ?? ""),
    name: String(formData.get("name") ?? ""),
    brand: String(formData.get("brand") ?? ""),
    category: String(formData.get("category") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    tracksExpiry: formData.get("noExpiry") !== "1",
    costPrice: String(formData.get("costPrice") ?? ""),
    sellingPrice: String(formData.get("sellingPrice") ?? ""),
    batchNumber: String(formData.get("batchNumber") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    manufacturingDate: String(formData.get("manufacturingDate") ?? ""),
    expiryDate: String(formData.get("expiryDate") ?? ""),
  });
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  const d = parsed.data;

  try {
    // Ownership check: the batch must belong to one of this admin's stores.
    const batch = await prisma.inventoryBatch.findFirst({
      where: { id: d.batchId, store: { adminId: admin.id } },
      select: {
        id: true,
        quantityReceived: true,
        quantityRemaining: true,
        batchNumber: true,
        manufacturingDate: true,
        expiryDate: true,
        store: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, brand: true, category: true, unit: true, costPrice: true, sellingPrice: true } },
      },
    });
    if (!batch) return { ok: false, message: "This product is no longer in stock here. Refresh the page." };

    const quantity = new Prisma.Decimal(d.quantity);
    const manufacturingDate = d.manufacturingDate ? parseDateOnly(d.manufacturingDate) : null;
    const expiryDate = d.tracksExpiry && d.expiryDate ? parseDateOnly(d.expiryDate) : null;

    const product = await prisma.$transaction(async (tx) => {
      await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: {
          batchNumber: d.batchNumber,
          quantityRemaining: quantity,
          // Received can't be less than what is on hand.
          ...(quantity.greaterThan(batch.quantityReceived) ? { quantityReceived: quantity } : {}),
          manufacturingDate,
          expiryDate,
        },
      });
      const updated = await tx.product.update({
        where: { id: batch.product.id },
        data: {
          name: d.name,
          brand: d.brand,
          category: d.category,
          unit: d.unit,
          tracksExpiry: d.tracksExpiry,
          costPrice: d.costPrice,
          sellingPrice: d.sellingPrice,
          // Only re-derive the type when the category actually changed.
          ...(d.category !== batch.product.category
            ? { productType: isPerishableCategory(d.category) ? "PERISHABLE" : "NON_PERISHABLE" }
            : {}),
        },
        select: { name: true, unit: true },
      });
      await logActivity(
        actorOf(admin),
        [
          {
            adminId: admin.id,
            action: "STOCK_UPDATED",
            storeId: batch.store.id,
            storeName: batch.store.name,
            productName: updated.name,
            unit: updated.unit,
            quantity: d.quantity,
            details: describeChanges(
              {
                name: batch.product.name,
                brand: batch.product.brand,
                category: batch.product.category,
                unit: batch.product.unit,
                quantity: batch.quantityRemaining.toNumber(),
                batchNumber: batch.batchNumber,
                manufacturingDate: batch.manufacturingDate,
                expiryDate: batch.expiryDate,
                costPrice: n(batch.product.costPrice),
                sellingPrice: n(batch.product.sellingPrice),
              },
              { ...d, quantity: d.quantity, manufacturingDate, expiryDate },
            ),
          },
        ],
        tx,
      );
      return updated;
    });

    refresh();
    return { ok: true, productName: product.name };
  } catch (error) {
    console.error("[product:update] failed", error);
    return { ok: false, message: "We couldn't save the changes. Please try again." };
  }
}

/* ───────────────────────────── Remove stock ───────────────────────────── */

const batchForLog = {
  id: true,
  quantityRemaining: true,
  store: { select: { id: true, name: true } },
  product: { select: { name: true, unit: true } },
} as const;

/**
 * Removes the given stock batches from a store, with a reason (sold, expired,
 * damaged…) recorded in the history. Catalog products are kept so barcodes
 * are still recognised.
 */
export async function deleteStockAction(storeId: string, batchIds: string[], reason: RemovalReason = "OTHER"): Promise<DeleteStockResult> {
  const admin = await requireAdmin();
  if (
    typeof storeId !== "string" ||
    !Array.isArray(batchIds) ||
    batchIds.length === 0 ||
    batchIds.length > 500 ||
    !batchIds.every((id) => typeof id === "string" && id.length > 0 && id.length <= 40)
  ) {
    return { ok: false, message: "Select at least one product to delete." };
  }
  if (!isRemovalReason(reason)) return { ok: false, message: "Choose why the stock is being removed." };

  try {
    const count = await prisma.$transaction(async (tx) => {
      const where = { id: { in: batchIds }, storeId, store: { adminId: admin.id } };
      const batches = await tx.inventoryBatch.findMany({ where, select: batchForLog });
      if (batches.length === 0) return 0;
      await tx.inventoryBatch.deleteMany({ where: { id: { in: batches.map((b) => b.id) } } });
      await logActivity(
        actorOf(admin),
        batches.map((b) => ({
          adminId: admin.id,
          action: "STOCK_REMOVED" as const,
          reason,
          storeId: b.store.id,
          storeName: b.store.name,
          productName: b.product.name,
          unit: b.product.unit,
          quantity: b.quantityRemaining.toNumber(),
        })),
        tx,
      );
      return batches.length;
    });
    if (count === 0) return { ok: false, message: "Those products were already removed. Refresh the page." };
    refresh();
    return { ok: true, deleted: count };
  } catch (error) {
    console.error("[product:delete] failed", error);
    return { ok: false, message: "We couldn't delete the products. Please try again." };
  }
}

/** Removes every expired, still-in-stock batch from a store in one go (logged as "expired, thrown away"). */
export async function deleteExpiredStockAction(storeId: string): Promise<DeleteStockResult> {
  const admin = await requireAdmin();
  if (typeof storeId !== "string" || !storeId) return { ok: false, message: "This store no longer exists." };

  try {
    const count = await prisma.$transaction(async (tx) => {
      const batches = await tx.inventoryBatch.findMany({
        where: { storeId, store: { adminId: admin.id }, quantityRemaining: { gt: 0 }, expiryDate: { lt: todayUtc() } },
        select: batchForLog,
      });
      if (batches.length === 0) return 0;
      await tx.inventoryBatch.deleteMany({ where: { id: { in: batches.map((b) => b.id) } } });
      await logActivity(
        actorOf(admin),
        batches.map((b) => ({
          adminId: admin.id,
          action: "EXPIRED_CLEARED" as const,
          reason: "EXPIRED" as const,
          storeId: b.store.id,
          storeName: b.store.name,
          productName: b.product.name,
          unit: b.product.unit,
          quantity: b.quantityRemaining.toNumber(),
        })),
        tx,
      );
      return batches.length;
    });
    if (count === 0) return { ok: false, message: "There are no expired products to delete." };
    refresh();
    return { ok: true, deleted: count };
  } catch (error) {
    console.error("[product:delete-expired] failed", error);
    return { ok: false, message: "We couldn't delete the expired products. Please try again." };
  }
}
