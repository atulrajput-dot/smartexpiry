import "server-only";
import { prisma } from "@/lib/prisma";
import { daysUntil, expiryStatus, todayUtc, type ExpiryStatus } from "@/lib/products/catalog";

/** One stock batch of a product in a store, ready for display. */
export type InventoryRow = {
  id: string;
  productId: string;
  name: string;
  brand: string | null;
  category: string;
  imageUrl: string | null;
  barcode: string | null;
  batch: string | null;
  quantity: number;
  unit: string;
  /** "YYYY-MM-DD", or null for products that don't expire. */
  expiresOn: string | null;
  /** "YYYY-MM-DD" or null. */
  manufacturedOn: string | null;
  tracksExpiry: boolean;
  /** Per unit, or null when not set. */
  costPrice: number | null;
  sellingPrice: number | null;
  /** Negative = expired, 0 = today, null = no expiry. */
  daysLeft: number | null;
  status: ExpiryStatus;
};

export type StoreInventory = {
  rows: InventoryRow[];
  summary: {
    totalProducts: number;
    totalUnits: number;
    fresh: number;
    expiring: number;
    expired: number;
    noExpiry: number;
    expiringUnits: number;
    expiredUnits: number;
    /** Cost value (quantity × cost price) of products with a cost price set. */
    expiringValue: number;
    expiredValue: number;
    stockValue: number;
  };
};

/** All in-stock batches of a store (caller must already have checked ownership). */
export async function getStoreInventory(storeId: string): Promise<StoreInventory> {
  const batches = await prisma.inventoryBatch.findMany({
    where: { storeId, quantityRemaining: { gt: 0 } },
    orderBy: [{ expiryDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    select: {
      id: true,
      batchNumber: true,
      quantityRemaining: true,
      expiryDate: true,
      manufacturingDate: true,
      product: { select: { id: true, name: true, brand: true, category: true, unit: true, imageUrl: true, barcode: true, tracksExpiry: true, costPrice: true, sellingPrice: true } },
    },
  });

  const today = todayUtc();
  const rows: InventoryRow[] = batches.map((b) => {
    const daysLeft = b.expiryDate ? daysUntil(b.expiryDate, today) : null;
    return {
      id: b.id,
      productId: b.product.id,
      name: b.product.name,
      brand: b.product.brand,
      category: b.product.category,
      imageUrl: b.product.imageUrl,
      barcode: b.product.barcode,
      batch: b.batchNumber,
      quantity: b.quantityRemaining.toNumber(),
      unit: b.product.unit,
      expiresOn: b.expiryDate ? b.expiryDate.toISOString().slice(0, 10) : null,
      manufacturedOn: b.manufacturingDate ? b.manufacturingDate.toISOString().slice(0, 10) : null,
      tracksExpiry: b.product.tracksExpiry,
      costPrice: b.product.costPrice ? b.product.costPrice.toNumber() : null,
      sellingPrice: b.product.sellingPrice ? b.product.sellingPrice.toNumber() : null,
      daysLeft,
      status: expiryStatus(daysLeft),
    };
  });

  const units = (s?: ExpiryStatus) =>
    Math.round(rows.filter((r) => !s || r.status === s).reduce((sum, r) => sum + r.quantity, 0) * 100) / 100;
  const count = (s: ExpiryStatus) => rows.filter((r) => r.status === s).length;
  const value = (s?: ExpiryStatus) =>
    Math.round(rows.filter((r) => !s || r.status === s).reduce((sum, r) => sum + r.quantity * (r.costPrice ?? 0), 0) * 100) / 100;

  return {
    rows,
    summary: {
      totalProducts: rows.length,
      totalUnits: units(),
      fresh: count("fresh"),
      expiring: count("expiring"),
      expired: count("expired"),
      noExpiry: count("none"),
      expiringUnits: units("expiring"),
      expiredUnits: units("expired"),
      expiringValue: value("expiring"),
      expiredValue: value("expired"),
      stockValue: value(),
    },
  };
}
