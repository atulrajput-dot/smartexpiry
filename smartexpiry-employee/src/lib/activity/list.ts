import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const ACTIVITY_PAGE_SIZE = 20;
const ACTIONS = ["STOCK_ADDED", "STOCK_UPDATED", "STOCK_REMOVED", "EXPIRED_CLEARED"] as const;
export type ActivityActionKey = (typeof ACTIONS)[number];

export type ActivityQuery = { store: string; person: string; action: ActivityActionKey | ""; page: number };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseActivityQuery(sp: Record<string, string | string[] | undefined>): ActivityQuery {
  const action = one(sp.action);
  const page = Number.parseInt(one(sp.page), 10);
  return {
    store: one(sp.store).slice(0, 40),
    person: one(sp.person).slice(0, 40),
    action: (ACTIONS as readonly string[]).includes(action) ? (action as ActivityActionKey) : "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export type ActivityRow = {
  id: string;
  at: string;
  action: ActivityActionKey;
  reason: string | null;
  actorName: string;
  actorLabel: string;
  isAdmin: boolean;
  storeId: string | null;
  storeName: string;
  productName: string;
  quantity: number | null;
  unit: string | null;
  details: string | null;
};

/** One page of the company's history, newest first. `person` = "admin" or an employee id. */
export async function listActivity(adminId: string, q: ActivityQuery) {
  const where: Prisma.ActivityLogWhereInput = {
    adminId,
    ...(q.store ? { storeId: q.store } : {}),
    ...(q.action ? { action: q.action } : {}),
    ...(q.person === "admin" ? { actorAdminId: { not: null } } : q.person ? { actorEmployeeId: q.person } : {}),
  };
  const total = await prisma.activityLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE));
  const page = Math.min(q.page, totalPages);
  const rows = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * ACTIVITY_PAGE_SIZE,
    take: ACTIVITY_PAGE_SIZE,
  });
  return {
    total,
    page,
    totalPages,
    rows: rows.map(
      (r): ActivityRow => ({
        id: r.id,
        at: r.createdAt.toISOString(),
        action: r.action,
        reason: r.reason,
        actorName: r.actorName,
        actorLabel: r.actorLabel,
        isAdmin: !!r.actorAdminId || r.actorLabel === "Admin",
        storeId: r.storeId,
        storeName: r.storeName,
        productName: r.productName,
        quantity: r.quantity ? r.quantity.toNumber() : null,
        unit: r.unit,
        details: r.details,
      }),
    ),
  };
}
