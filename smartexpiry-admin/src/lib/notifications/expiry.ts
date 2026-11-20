import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ALERT_DAYS, daysUntil, todayUtc } from "@/lib/products/catalog";

/**
 * Expiry notifications: in-stock batches that expire within ALERT_DAYS days
 * (today, tomorrow, the day after) or have already expired. Computed live, so
 * they disappear as soon as the stock is sold, removed or re-dated.
 * `stores` limits them to the stores a viewer may see.
 */

export type ExpiryAlert = {
  id: string;
  productName: string;
  brand: string | null;
  imageUrl: string | null;
  unit: string;
  quantity: number;
  batch: string | null;
  storeId: string;
  storeName: string;
  storeCode: string;
  expiresOn: string;
  /** Negative = expired that many days ago. */
  daysLeft: number;
  /** quantity × cost price, or null without a cost price. */
  value: number | null;
};

export type ExpiryAlerts = {
  items: ExpiryAlert[];
  counts: { expired: number; today: number; tomorrow: number; soon: number };
  valueAtRisk: number;
};

const DAY = 86_400_000;
const MAX_ITEMS = 500;

const whereFor = (stores: Prisma.StoreWhereInput): Prisma.InventoryBatchWhereInput => ({
  quantityRemaining: { gt: 0 },
  expiryDate: { lte: new Date(todayUtc().getTime() + ALERT_DAYS * DAY) },
  store: stores,
});

/** Number shown on the bell. */
export function countExpiryAlerts(stores: Prisma.StoreWhereInput) {
  return prisma.inventoryBatch.count({ where: whereFor(stores) });
}

export async function getExpiryAlerts(stores: Prisma.StoreWhereInput): Promise<ExpiryAlerts> {
  const today = todayUtc();
  const rows = await prisma.inventoryBatch.findMany({
    where: whereFor(stores),
    orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
    take: MAX_ITEMS,
    select: {
      id: true,
      batchNumber: true,
      quantityRemaining: true,
      expiryDate: true,
      store: { select: { id: true, name: true, code: true } },
      product: { select: { name: true, brand: true, imageUrl: true, unit: true, costPrice: true } },
    },
  });

  const items: ExpiryAlert[] = rows.map((r) => {
    const quantity = r.quantityRemaining.toNumber();
    const cost = r.product.costPrice?.toNumber() ?? null;
    return {
      id: r.id,
      productName: r.product.name,
      brand: r.product.brand,
      imageUrl: r.product.imageUrl,
      unit: r.product.unit,
      quantity,
      batch: r.batchNumber,
      storeId: r.store.id,
      storeName: r.store.name,
      storeCode: r.store.code,
      expiresOn: r.expiryDate!.toISOString().slice(0, 10),
      daysLeft: daysUntil(r.expiryDate!, today),
      value: cost === null ? null : Math.round(quantity * cost * 100) / 100,
    };
  });

  const counts = { expired: 0, today: 0, tomorrow: 0, soon: 0 };
  for (const i of items) {
    if (i.daysLeft < 0) counts.expired++;
    else if (i.daysLeft === 0) counts.today++;
    else if (i.daysLeft === 1) counts.tomorrow++;
    else counts.soon++;
  }
  const valueAtRisk = Math.round(items.reduce((s, i) => s + (i.value ?? 0), 0) * 100) / 100;
  return { items, counts, valueAtRisk };
}
