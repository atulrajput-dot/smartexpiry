"use server";

import { refresh } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireEmployee } from "@/lib/auth/dal";
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
  type UpdateStockResult,
  type LookupResult,
  type ProductPrefill,
  type StoreAllocation,
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
 * Scanned/typed code → form pre-fill:
 * 1. GS1 codes → expiry, batch, manufacturing date straight from the barcode.
 * 2. The company's catalog (same products the admin sees) → saved details.
 * 3. Otherwise Open Food Facts / Open Beauty Facts.
 */
export async function lookupBarcodeAction(raw: string): Promise<LookupResult> {
  const me = await requireEmployee();
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
      where: { adminId_barcode: { adminId: me.adminId, barcode: scanned.gtin } },
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
  }

  const filled = (Object.keys(LABELS) as (keyof ProductPrefill)[])
    .filter((k) => prefill[k] !== null && prefill[k] !== "")
    .map((k) => LABELS[k]!);

  return { ok: true, found, fromGs1: scanned.isGs1, prefill, filled };
}

/* ───────────────────────────── Add to stores ───────────────────────────── */

/**
 * Adds a product to one or more of the employee's stores, each with its own
 * quantity (batch number and dates are shared — same delivery).
 * The product goes into the company catalog (matched by barcode, or by
 * name + brand without one) so the admin sees it too. Only stores this
 * employee is assigned to are accepted.
 */
export async function addProductToStoresAction(formData: FormData): Promise<AddStockResult> {
  const me = await requireEmployee();

  const storeIds = [...new Set(formData.getAll("storeIds").map(String))].slice(0, 50);
  const allocations: StoreAllocation[] = storeIds.map((storeId) => ({
    storeId,
    quantity: String(formData.get(`quantity_${storeId}`) ?? ""),
  }));

  const parsed = validateAddStock(
    {
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
      manufacturingDate: String(formData.get("manufacturingDate") ?? ""),
      expiryDate: String(formData.get("expiryDate") ?? ""),
    },
    allocations,
  );
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  const d = parsed.data;

  // Access check: every chosen store must be one of this employee's stores.
  const myStores = new Map(me.stores.map((s) => [s.id, s.name]));
  if (parsed.allocations.some((a) => !myStores.has(a.storeId))) {
    return { ok: false, errors: { storeIds: ["You can only add products to your own stores. Refresh and try again."] } };
  }

  try {
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
    const manufacturingDate = d.manufacturingDate ? parseDateOnly(d.manufacturingDate) : null;
    const expiryDate = d.tracksExpiry && d.expiryDate ? parseDateOnly(d.expiryDate) : null;

    const result = await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction: still assigned and still the company's stores.
      const allowed = await tx.employeeStore.count({
        where: { employeeId: me.id, storeId: { in: parsed.allocations.map((a) => a.storeId) }, store: { adminId: me.adminId } },
      });
      if (allowed !== parsed.allocations.length) return null;

      const existing = d.barcode
        ? await tx.product.findUnique({ where: { adminId_barcode: { adminId: me.adminId, barcode: d.barcode } }, select: { id: true } })
        : await tx.product.findFirst({
            where: {
              adminId: me.adminId,
              barcode: null,
              name: { equals: d.name, mode: "insensitive" },
              brand: d.brand ? { equals: d.brand, mode: "insensitive" } : null,
            },
            select: { id: true },
          });

      const product = existing
        ? await tx.product.update({ where: { id: existing.id }, data: details, select: { id: true, name: true, unit: true } })
        : await tx.product.create({
            data: { ...details, adminId: me.adminId, barcode: d.barcode, source: d.source },
            select: { id: true, name: true, unit: true },
          });

      await tx.inventoryBatch.createMany({
        data: parsed.allocations.map((a) => ({
          productId: product.id,
          storeId: a.storeId,
          batchNumber: d.batchNumber,
          quantityReceived: new Prisma.Decimal(a.quantity),
          quantityRemaining: new Prisma.Decimal(a.quantity),
          manufacturingDate,
          expiryDate,
          createdByEmployeeId: me.id,
        })),
      });

      await logActivity(
        actorOf(me),
        parsed.allocations.map((a) => ({
          adminId: me.adminId,
          action: "STOCK_ADDED" as const,
          storeId: a.storeId,
          storeName: myStores.get(a.storeId)!,
          productName: product.name,
          unit: product.unit,
          quantity: a.quantity,
          details: [d.batchNumber && `Batch ${d.batchNumber}`, d.tracksExpiry && d.expiryDate ? `Expires ${formatDay(d.expiryDate)}` : "No expiry"]
            .filter(Boolean)
            .join(" · "),
        })),
        tx,
      );

      return { product, isNewProduct: !existing };
    });

    if (!result) {
      return { ok: false, errors: { storeIds: ["You're no longer assigned to one of these stores. Refresh and try again."] } };
    }

    refresh(); // Home tiles and store counts update in the same response
    return {
      ok: true,
      productName: result.product.name,
      unit: result.product.unit,
      expiryDate: d.tracksExpiry ? d.expiryDate : null,
      isNewProduct: result.isNewProduct,
      stores: parsed.allocations.map((a) => ({ name: myStores.get(a.storeId)!, quantity: a.quantity })),
    };
  } catch (error) {
    console.error("[product:add] failed", error);
    return { ok: false, message: "We couldn't add the product. Please try again." };
  }
}

/* ───────────────────────────── Edit / delete stock ───────────────────────────── */

const actorOf = (me: { id: string; name: string; employeeCode: string }): Actor => ({
  kind: "employee",
  id: me.id,
  name: me.name,
  code: me.employeeCode,
});
const n = (v: { toNumber(): number } | null) => (v ? v.toNumber() : null);

/** Prisma filter: a store this employee is currently assigned to (in their company). */
const myStore = (me: { id: string; adminId: string }) => ({
  adminId: me.adminId,
  employees: { some: { employeeId: me.id } },
});

/**
 * Updates one stock batch in one of the employee's stores (quantity, batch,
 * dates) and the shared catalog details of its product, and records the change.
 */
export async function updateStockAction(formData: FormData): Promise<UpdateStockResult> {
  const me = await requireEmployee();

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
    const batch = await prisma.inventoryBatch.findFirst({
      where: { id: d.batchId, store: myStore(me) },
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
    if (!batch) return { ok: false, message: "This product is no longer in stock in your stores. Refresh the page." };

    const quantity = new Prisma.Decimal(d.quantity);
    const manufacturingDate = d.manufacturingDate ? parseDateOnly(d.manufacturingDate) : null;
    const expiryDate = d.tracksExpiry && d.expiryDate ? parseDateOnly(d.expiryDate) : null;

    const product = await prisma.$transaction(async (tx) => {
      await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: {
          batchNumber: d.batchNumber,
          quantityRemaining: quantity,
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
          ...(d.category !== batch.product.category
            ? { productType: isPerishableCategory(d.category) ? "PERISHABLE" : "NON_PERISHABLE" }
            : {}),
        },
        select: { name: true, unit: true },
      });
      await logActivity(
        actorOf(me),
        [
          {
            adminId: me.adminId,
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
              { ...d, manufacturingDate, expiryDate },
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

const batchForLog = {
  id: true,
  quantityRemaining: true,
  store: { select: { id: true, name: true } },
  product: { select: { name: true, unit: true } },
} as const;

/** Removes the given stock batches from one of the employee's stores, with a reason for the history. */
export async function deleteStockAction(storeId: string, batchIds: string[], reason: RemovalReason = "OTHER"): Promise<DeleteStockResult> {
  const me = await requireEmployee();
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
      const batches = await tx.inventoryBatch.findMany({ where: { id: { in: batchIds }, storeId, store: myStore(me) }, select: batchForLog });
      if (batches.length === 0) return 0;
      await tx.inventoryBatch.deleteMany({ where: { id: { in: batches.map((b) => b.id) } } });
      await logActivity(
        actorOf(me),
        batches.map((b) => ({
          adminId: me.adminId,
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

/** Removes every expired, still-in-stock batch from one of the employee's stores (logged as expired). */
export async function deleteExpiredStockAction(storeId: string): Promise<DeleteStockResult> {
  const me = await requireEmployee();
  if (typeof storeId !== "string" || !storeId) return { ok: false, message: "This store no longer exists." };

  try {
    const count = await prisma.$transaction(async (tx) => {
      const batches = await tx.inventoryBatch.findMany({
        where: { storeId, store: myStore(me), quantityRemaining: { gt: 0 }, expiryDate: { lt: todayUtc() } },
        select: batchForLog,
      });
      if (batches.length === 0) return 0;
      await tx.inventoryBatch.deleteMany({ where: { id: { in: batches.map((b) => b.id) } } });
      await logActivity(
        actorOf(me),
        batches.map((b) => ({
          adminId: me.adminId,
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
