import "server-only";
import { prisma } from "@/lib/prisma";
import { daysUntil, EXPIRING_SOON_DAYS, expiryStatus, todayUtc, type ExpiryStatus } from "@/lib/products/catalog";

/**
 * Everything the admin dashboard shows, computed with database aggregates
 * (counts / sums / group-bys) rather than loading every batch.
 * Used by the dashboard page and by GET /api/dashboard.
 */

export const OUTLOOK_WEEKS = 8;
const ATTENTION_LIMIT = 8;
const DAY = 86_400_000;

export type DashboardSummary = {
  generatedAt: string;
  totals: {
    stores: number;
    employees: number;
    activeEmployees: number;
    /** In-stock product batches across all stores. */
    products: number;
    units: number;
    expiringSoon: number;
    expiringSoonUnits: number;
    expired: number;
    expiredUnits: number;
  };
  /** Products expiring in each of the next OUTLOOK_WEEKS weeks (week 0 starts today). */
  outlook: { weekStart: string; weekEnd: string; products: number; units: number }[];
  /** Most urgent batches: expired first (most recent), then soonest to expire. */
  attention: {
    id: string;
    productName: string;
    unit: string;
    quantity: number;
    storeId: string;
    storeName: string;
    expiresOn: string;
    daysLeft: number;
    status: ExpiryStatus;
  }[];
  stores: {
    id: string;
    name: string;
    code: string;
    city: string;
    products: number;
    expiringSoon: number;
    expired: number;
    employees: number;
  }[];
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const num = (v: { toNumber(): number } | null | undefined) => (v ? v.toNumber() : 0);

export async function getDashboardSummary(adminId: string): Promise<DashboardSummary> {
  const today = todayUtc();
  const soonEnd = new Date(today.getTime() + EXPIRING_SOON_DAYS * DAY); // inclusive
  const outlookEnd = new Date(today.getTime() + (OUTLOOK_WEEKS * 7 - 1) * DAY); // inclusive

  // Only in-stock batches in this admin's stores.
  const inStock = { quantityRemaining: { gt: 0 }, store: { adminId } } as const;
  const expiredWhere = { ...inStock, expiryDate: { lt: today } };
  const soonWhere = { ...inStock, expiryDate: { gte: today, lte: soonEnd } };

  const [
    storeRows,
    employeeGroups,
    totalAgg,
    expiredAgg,
    soonAgg,
    outlookGroups,
    urgentExpired,
    urgentSoon,
    perStoreTotal,
    perStoreSoon,
    perStoreExpired,
    perStoreEmployees,
  ] = await Promise.all([
    prisma.store.findMany({ where: { adminId }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true, city: true } }),
    prisma.employee.groupBy({ by: ["status"], where: { adminId }, _count: { _all: true } }),
    prisma.inventoryBatch.aggregate({ where: inStock, _count: { _all: true }, _sum: { quantityRemaining: true } }),
    prisma.inventoryBatch.aggregate({ where: expiredWhere, _count: { _all: true }, _sum: { quantityRemaining: true } }),
    prisma.inventoryBatch.aggregate({ where: soonWhere, _count: { _all: true }, _sum: { quantityRemaining: true } }),
    prisma.inventoryBatch.groupBy({
      by: ["expiryDate"],
      where: { ...inStock, expiryDate: { gte: today, lte: outlookEnd } },
      _count: { _all: true },
      _sum: { quantityRemaining: true },
    }),
    prisma.inventoryBatch.findMany({
      where: expiredWhere,
      orderBy: { expiryDate: "desc" },
      take: ATTENTION_LIMIT,
      select: attentionSelect,
    }),
    prisma.inventoryBatch.findMany({
      where: soonWhere,
      orderBy: { expiryDate: "asc" },
      take: ATTENTION_LIMIT,
      select: attentionSelect,
    }),
    prisma.inventoryBatch.groupBy({ by: ["storeId"], where: inStock, _count: { _all: true } }),
    prisma.inventoryBatch.groupBy({ by: ["storeId"], where: soonWhere, _count: { _all: true } }),
    prisma.inventoryBatch.groupBy({ by: ["storeId"], where: expiredWhere, _count: { _all: true } }),
    prisma.employeeStore.groupBy({ by: ["storeId"], where: { store: { adminId } }, _count: { _all: true } }),
  ]);

  // Weekly outlook buckets
  const outlook = Array.from({ length: OUTLOOK_WEEKS }, (_, w) => ({
    weekStart: iso(new Date(today.getTime() + w * 7 * DAY)),
    weekEnd: iso(new Date(today.getTime() + (w * 7 + 6) * DAY)),
    products: 0,
    units: 0,
  }));
  for (const g of outlookGroups) {
    if (!g.expiryDate) continue;
    const week = Math.floor(daysUntil(g.expiryDate, today) / 7);
    const bucket = outlook[week];
    if (!bucket) continue;
    bucket.products += g._count._all;
    bucket.units += num(g._sum.quantityRemaining);
  }

  const byStore = (groups: { storeId: string; _count: { _all: number } }[]) =>
    new Map(groups.map((g) => [g.storeId, g._count._all]));
  const totalMap = byStore(perStoreTotal);
  const soonMap = byStore(perStoreSoon);
  const expiredMap = byStore(perStoreExpired);
  const employeeMap = byStore(perStoreEmployees);

  const employees = employeeGroups.reduce((s, g) => s + g._count._all, 0);
  const activeEmployees = employeeGroups.find((g) => g.status === "ACTIVE")?._count._all ?? 0;

  const toAttention = (b: AttentionRow) => {
    const daysLeft = daysUntil(b.expiryDate!, today);
    return {
      id: b.id,
      productName: b.product.name,
      unit: b.product.unit,
      quantity: num(b.quantityRemaining),
      storeId: b.store.id,
      storeName: b.store.name,
      expiresOn: iso(b.expiryDate!),
      daysLeft,
      status: expiryStatus(daysLeft),
    };
  };

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      stores: storeRows.length,
      employees,
      activeEmployees,
      products: totalAgg._count._all,
      units: num(totalAgg._sum.quantityRemaining),
      expiringSoon: soonAgg._count._all,
      expiringSoonUnits: num(soonAgg._sum.quantityRemaining),
      expired: expiredAgg._count._all,
      expiredUnits: num(expiredAgg._sum.quantityRemaining),
    },
    outlook: outlook.map((o) => ({ ...o, units: Math.round(o.units * 100) / 100 })),
    // Expired first, then the soonest to expire; capped for a compact list.
    attention: [...urgentExpired, ...urgentSoon].slice(0, ATTENTION_LIMIT).map(toAttention),
    stores: storeRows.map((s) => ({
      ...s,
      products: totalMap.get(s.id) ?? 0,
      expiringSoon: soonMap.get(s.id) ?? 0,
      expired: expiredMap.get(s.id) ?? 0,
      employees: employeeMap.get(s.id) ?? 0,
    })),
  };
}

const attentionSelect = {
  id: true,
  quantityRemaining: true,
  expiryDate: true,
  product: { select: { name: true, unit: true } },
  store: { select: { id: true, name: true } },
} as const;

type AttentionRow = {
  id: string;
  quantityRemaining: { toNumber(): number };
  expiryDate: Date | null;
  product: { name: string; unit: string };
  store: { id: string; name: string };
};
