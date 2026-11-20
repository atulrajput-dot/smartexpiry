import "server-only";
import { prisma } from "@/lib/prisma";
import { EXPIRING_SOON_DAYS, todayUtc } from "@/lib/products/catalog";

/**
 * Stock numbers for the stores an employee is assigned to. Same rules as the
 * Admin dashboard: in-stock batches only; "expiring soon" = today … today+7.
 */

export type StoreCounts = { products: number; expiringSoon: number; expired: number };
export type EmployeeStoreStats = {
  totals: StoreCounts & { stores: number };
  perStore: Record<string, StoreCounts>;
};

const DAY = 86_400_000;

export async function getEmployeeStoreStats(storeIds: string[]): Promise<EmployeeStoreStats> {
  const empty: StoreCounts = { products: 0, expiringSoon: 0, expired: 0 };
  if (storeIds.length === 0) return { totals: { stores: 0, ...empty }, perStore: {} };

  const today = todayUtc();
  const soonEnd = new Date(today.getTime() + EXPIRING_SOON_DAYS * DAY);
  const inStock = { storeId: { in: storeIds }, quantityRemaining: { gt: 0 } };

  const [all, soon, expired] = await Promise.all([
    prisma.inventoryBatch.groupBy({ by: ["storeId"], where: inStock, _count: { _all: true } }),
    prisma.inventoryBatch.groupBy({ by: ["storeId"], where: { ...inStock, expiryDate: { gte: today, lte: soonEnd } }, _count: { _all: true } }),
    prisma.inventoryBatch.groupBy({ by: ["storeId"], where: { ...inStock, expiryDate: { lt: today } }, _count: { _all: true } }),
  ]);

  const perStore: Record<string, StoreCounts> = Object.fromEntries(storeIds.map((id) => [id, { ...empty }]));
  for (const g of all) perStore[g.storeId]!.products = g._count._all;
  for (const g of soon) perStore[g.storeId]!.expiringSoon = g._count._all;
  for (const g of expired) perStore[g.storeId]!.expired = g._count._all;

  const sum = (k: keyof StoreCounts) => Object.values(perStore).reduce((s, c) => s + c[k], 0);
  return {
    totals: { stores: storeIds.length, products: sum("products"), expiringSoon: sum("expiringSoon"), expired: sum("expired") },
    perStore,
  };
}
