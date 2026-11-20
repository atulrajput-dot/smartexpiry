import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDashboardSummary } from "@/lib/dashboard/summary";
import { prisma } from "@/lib/prisma";
import { daysUntil, EXPIRING_SOON_DAYS, expiryStatus, REMOVAL_REASONS, todayUtc } from "@/lib/products/catalog";

/**
 * Read-only tools the AI can call. Every query is scoped to the signed-in
 * admin (from the session, never from the AI), results are capped in size,
 * and no contact details, passwords or tokens are ever returned.
 */
export type ToolContext = { adminId: string };
type Args = Record<string, unknown>;

const DAY = 86_400_000;
const MAX_ROWS = 3000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const num = (v: { toNumber(): number } | null | undefined) => (v ? v.toNumber() : 0);
const str = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : "");
function int(v: unknown, fallback: number, min: number, max: number) {
  const n = typeof v === "number" ? Math.trunc(v) : Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  typeof v === "string" && (options as readonly string[]).includes(v) ? (v as T) : fallback;

/* ─────────────────────────── Store name matching ─────────────────────────── */

type StoreRef = { id: string; name: string; city: string };

/** Finds stores by (part of) name, code or city. null = no store filter asked for. */
export async function matchStores(adminId: string, text: unknown): Promise<StoreRef[] | null> {
  const q = str(text);
  if (!q) return null;
  const select = { id: true, name: true, city: true } as const;
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  let stores = await prisma.store.findMany({
    where: { adminId, OR: [{ name: contains(q) }, { code: contains(q) }, { city: contains(q) }] },
    select,
  });
  if (stores.length === 0) {
    // "freshmart store" → try the individual words.
    const words = q.split(/\s+/).filter((w) => w.length >= 3 && !/^(store|shop|the|branch)$/i.test(w));
    if (words.length) stores = await prisma.store.findMany({ where: { adminId, OR: words.map((w) => ({ name: contains(w) })) }, select });
  }
  return stores;
}

async function noStoreMatch(adminId: string, text: unknown) {
  const all = await prisma.store.findMany({ where: { adminId }, select: { name: true }, orderBy: { name: "asc" } });
  return { error: `No store matches "${str(text)}".`, yourStores: all.map((s) => s.name) };
}

/* ─────────────────────────────── Tools ─────────────────────────────── */

async function stockValues(adminId: string) {
  const today = todayUtc();
  const soonEnd = new Date(today.getTime() + EXPIRING_SOON_DAYS * DAY);
  const rows = await prisma.inventoryBatch.findMany({
    where: { quantityRemaining: { gt: 0 }, store: { adminId } },
    select: { quantityRemaining: true, expiryDate: true, product: { select: { costPrice: true } } },
    take: 20_000,
  });
  let total = 0;
  let expired = 0;
  let expiring = 0;
  let withoutCost = 0;
  for (const r of rows) {
    if (!r.product.costPrice) {
      withoutCost++;
      continue;
    }
    const value = num(r.quantityRemaining) * num(r.product.costPrice);
    total += value;
    if (r.expiryDate && r.expiryDate < today) expired += value;
    else if (r.expiryDate && r.expiryDate <= soonEnd) expiring += value;
  }
  return {
    stockValueAtCost: round2(total),
    expiredValueAtCost: round2(expired),
    expiringSoonValueAtCost: round2(expiring),
    batchesWithoutCostPrice: withoutCost,
  };
}

export async function getOverview(ctx: ToolContext) {
  const [s, values] = await Promise.all([getDashboardSummary(ctx.adminId), stockValues(ctx.adminId)]);
  return {
    today: iso(todayUtc()),
    expiringSoonMeans: `expires within the next ${EXPIRING_SOON_DAYS} days`,
    stores: s.totals.stores,
    employees: { total: s.totals.employees, active: s.totals.activeEmployees },
    productBatchesInStock: s.totals.products,
    unitsInStock: s.totals.units,
    expiringSoon: { batches: s.totals.expiringSoon, units: s.totals.expiringSoonUnits },
    expired: { batches: s.totals.expired, units: s.totals.expiredUnits },
    money: values,
    perStore: s.stores.map((st) => ({
      storeId: st.id,
      name: st.name,
      code: st.code,
      city: st.city,
      productBatches: st.products,
      expiringSoon: st.expiringSoon,
      expired: st.expired,
      employees: st.employees,
    })),
    mostUrgent: s.attention.map((a) => ({
      product: a.productName,
      store: a.storeName,
      storeId: a.storeId,
      quantity: a.quantity,
      unit: a.unit,
      expiresOn: a.expiresOn,
      daysLeft: a.daysLeft,
      status: a.status,
    })),
  };
}

export async function queryStores(ctx: ToolContext, args: Args) {
  const matched = await matchStores(ctx.adminId, args.name);
  if (matched && matched.length === 0) return noStoreMatch(ctx.adminId, args.name);
  const ids = matched?.map((s) => s.id);
  const summary = await getDashboardSummary(ctx.adminId);
  const details = await prisma.store.findMany({
    where: { adminId: ctx.adminId, ...(ids ? { id: { in: ids } } : {}) },
    select: { id: true, address: true, state: true, pincode: true, createdAt: true },
  });
  const extra = new Map(details.map((d) => [d.id, d]));
  const stores = summary.stores
    .filter((st) => !ids || ids.includes(st.id))
    .map((st) => ({
      storeId: st.id,
      name: st.name,
      code: st.code,
      city: st.city,
      address: extra.get(st.id) ? `${extra.get(st.id)!.address}, ${st.city}, ${extra.get(st.id)!.state} ${extra.get(st.id)!.pincode}` : undefined,
      productBatchesInStock: st.products,
      expiringSoon: st.expiringSoon,
      expired: st.expired,
      employees: st.employees,
      createdOn: extra.get(st.id) ? iso(extra.get(st.id)!.createdAt) : undefined,
    }));
  return { totalStores: stores.length, stores };
}

const STOCK_STATUS = ["all", "expired", "expiring_soon", "fresh", "no_expiry"] as const;
const GROUP_BY = ["none", "store", "category"] as const;

export async function queryStock(ctx: ToolContext, args: Args) {
  const today = todayUtc();
  const status = oneOf(args.status, STOCK_STATUS, "all");
  const within = args.expires_within_days === undefined ? null : int(args.expires_within_days, EXPIRING_SOON_DAYS, 0, 365);
  const groupBy = oneOf(args.group_by, GROUP_BY, "none");
  const limit = int(args.limit, 15, 1, 30);
  const category = str(args.category, 60);
  const search = str(args.search, 80);

  const stores = await matchStores(ctx.adminId, args.store);
  if (stores && stores.length === 0) return noStoreMatch(ctx.adminId, args.store);

  const where: Prisma.InventoryBatchWhereInput = {
    quantityRemaining: { gt: 0 },
    store: { adminId: ctx.adminId, ...(stores ? { id: { in: stores.map((s) => s.id) } } : {}) },
  };
  const productWhere: Prisma.ProductWhereInput = {};
  if (category) productWhere.category = { contains: category, mode: "insensitive" };
  if (search) {
    productWhere.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search } },
    ];
  }
  if (Object.keys(productWhere).length) where.product = productWhere;

  const soonEnd = new Date(today.getTime() + (within ?? EXPIRING_SOON_DAYS) * DAY);
  if (status === "expired") where.expiryDate = { lt: today };
  else if (status === "expiring_soon") where.expiryDate = { gte: today, lte: soonEnd };
  else if (status === "fresh") where.expiryDate = { gt: new Date(today.getTime() + EXPIRING_SOON_DAYS * DAY) };
  else if (status === "no_expiry") where.expiryDate = null;
  else if (within !== null) where.expiryDate = { gte: today, lte: soonEnd };

  const rows = await prisma.inventoryBatch.findMany({
    where,
    orderBy: [{ expiryDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: MAX_ROWS,
    select: {
      quantityRemaining: true,
      expiryDate: true,
      batchNumber: true,
      product: { select: { name: true, brand: true, category: true, unit: true, costPrice: true, sellingPrice: true } },
      store: { select: { id: true, name: true } },
    },
  });

  let units = 0;
  let valueAtCost = 0;
  let valueAtSelling = 0;
  const groups = new Map<string, { batches: number; units: number; valueAtCost: number; storeId?: string }>();
  const items = rows.map((r) => {
    const quantity = num(r.quantityRemaining);
    const cost = r.product.costPrice ? num(r.product.costPrice) : null;
    const sell = r.product.sellingPrice ? num(r.product.sellingPrice) : null;
    units += quantity;
    if (cost !== null) valueAtCost += quantity * cost;
    if (sell !== null) valueAtSelling += quantity * sell;
    const key = groupBy === "store" ? r.store.name : groupBy === "category" ? r.product.category : "";
    if (key) {
      const g = groups.get(key) ?? { batches: 0, units: 0, valueAtCost: 0, ...(groupBy === "store" ? { storeId: r.store.id } : {}) };
      g.batches++;
      g.units += quantity;
      g.valueAtCost += cost !== null ? quantity * cost : 0;
      groups.set(key, g);
    }
    const daysLeft = r.expiryDate ? daysUntil(r.expiryDate, today) : null;
    return {
      product: r.product.name,
      brand: r.product.brand ?? undefined,
      category: r.product.category,
      store: r.store.name,
      storeId: r.store.id,
      quantity,
      unit: r.product.unit,
      batch: r.batchNumber ?? undefined,
      expiresOn: r.expiryDate ? iso(r.expiryDate) : null,
      daysLeft,
      status: expiryStatus(daysLeft),
      costPrice: cost,
      sellingPrice: sell,
    };
  });

  return {
    today: iso(today),
    filters: { store: stores?.map((s) => s.name) ?? "all stores", status, expiresWithinDays: within ?? undefined, category: category || undefined, search: search || undefined },
    matchingBatches: rows.length,
    resultCapped: rows.length >= MAX_ROWS,
    totalUnits: round2(units),
    valueAtCost: round2(valueAtCost),
    valueAtSellingPrice: round2(valueAtSelling),
    groups: groupBy === "none" ? undefined : [...groups.entries()].map(([name, g]) => ({ name, ...g, units: round2(g.units), valueAtCost: round2(g.valueAtCost) })),
    items: items.slice(0, limit),
    moreItemsNotShown: Math.max(0, items.length - limit),
  };
}

export async function queryEmployees(ctx: ToolContext, args: Args) {
  const status = oneOf(args.status, ["all", "active", "inactive"] as const, "all");
  const search = str(args.search);
  const stores = await matchStores(ctx.adminId, args.store);
  if (stores && stores.length === 0) return noStoreMatch(ctx.adminId, args.store);

  const where: Prisma.EmployeeWhereInput = { adminId: ctx.adminId };
  if (status !== "all") where.status = status === "active" ? "ACTIVE" : "INACTIVE";
  if (stores) where.stores = { some: { storeId: { in: stores.map((s) => s.id) } } };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { employeeCode: { contains: search, mode: "insensitive" } },
      { designation: { contains: search, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.employee.findMany({
    where,
    orderBy: { name: "asc" },
    take: 100,
    select: {
      name: true,
      employeeCode: true,
      designation: true,
      status: true,
      lastLoginAt: true,
      stores: { select: { store: { select: { name: true } } } },
    },
  });
  return {
    filters: { store: stores?.map((s) => s.name) ?? "all stores", status, search: search || undefined },
    total: rows.length,
    active: rows.filter((r) => r.status === "ACTIVE").length,
    inactive: rows.filter((r) => r.status === "INACTIVE").length,
    employees: rows.map((r) => ({
      name: r.name,
      code: r.employeeCode,
      designation: r.designation,
      status: r.status.toLowerCase(),
      stores: r.stores.map((s) => s.store.name),
      lastSignIn: r.lastLoginAt ? r.lastLoginAt.toISOString() : "never",
    })),
    note: "Contact details are not shared with the assistant; see the Employees page.",
  };
}

const ACTIONS = { added: "STOCK_ADDED", updated: "STOCK_UPDATED", removed: "STOCK_REMOVED", expired_cleared: "EXPIRED_CLEARED" } as const;
const REASON_LABEL = new Map<string, string>(REMOVAL_REASONS.map((r) => [r.value, r.label]));

export async function queryActivity(ctx: ToolContext, args: Args) {
  const days = int(args.days, 7, 1, 90);
  const limit = int(args.limit, 15, 1, 30);
  const action = oneOf(args.action, ["all", "added", "updated", "removed", "expired_cleared"] as const, "all");
  const person = str(args.person);
  const stores = await matchStores(ctx.adminId, args.store);
  if (stores && stores.length === 0) return noStoreMatch(ctx.adminId, args.store);

  const where: Prisma.ActivityLogWhereInput = { adminId: ctx.adminId, createdAt: { gte: new Date(Date.now() - days * DAY) } };
  if (action !== "all") where.action = ACTIONS[action];
  if (stores) where.storeId = { in: stores.map((s) => s.id) };
  if (person) {
    where.OR = [
      { actorName: { contains: person, mode: "insensitive" } },
      { actorLabel: { contains: person, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      createdAt: true,
      action: true,
      reason: true,
      actorName: true,
      actorLabel: true,
      storeName: true,
      productName: true,
      quantity: true,
      unit: true,
      details: true,
    },
  });
  const byAction: Record<string, number> = {};
  const byPerson: Record<string, number> = {};
  for (const r of rows) {
    byAction[r.action] = (byAction[r.action] ?? 0) + 1;
    const who = `${r.actorName} (${r.actorLabel})`;
    byPerson[who] = (byPerson[who] ?? 0) + 1;
  }
  return {
    period: `last ${days} days`,
    filters: { store: stores?.map((s) => s.name) ?? "all stores", action, person: person || undefined },
    totalChanges: rows.length,
    byAction,
    byPerson,
    changes: rows.slice(0, limit).map((r) => ({
      when: r.createdAt.toISOString(),
      who: `${r.actorName} (${r.actorLabel})`,
      action: r.action,
      reason: r.reason ? REASON_LABEL.get(r.reason) ?? r.reason : undefined,
      store: r.storeName,
      product: r.productName,
      quantity: r.quantity ? num(r.quantity) : undefined,
      unit: r.unit ?? undefined,
      details: r.details ?? undefined,
    })),
    moreNotShown: Math.max(0, rows.length - limit),
  };
}

/* ─────────────────────── Declarations for the model ─────────────────────── */

const storeParam = { type: "STRING", description: "Store name, code or city, or part of it (e.g. \"Fresh Mart\"). Omit for all stores." };

export const TOOL_DECLARATIONS = [
  {
    name: "get_overview",
    description:
      "Business-wide snapshot: number of stores and employees, products in stock, expiring-soon and expired counts, stock value and value at risk (at cost), per-store counts, and the most urgent items. Use for general or summary questions.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "query_stores",
    description: "List stores with location, product counts, expiring and expired counts, and number of employees. Optionally filter by name, code or city.",
    parameters: { type: "OBJECT", properties: { name: storeParam } },
  },
  {
    name: "query_stock",
    description:
      "Search in-stock products (batches) with filters. Returns totals (batches, units, value at cost and selling price), optional groups, and the items sorted by expiry date (soonest first).",
    parameters: {
      type: "OBJECT",
      properties: {
        store: storeParam,
        status: {
          type: "STRING",
          enum: [...STOCK_STATUS],
          description: `expired = past expiry date; expiring_soon = expires today or within expires_within_days (default ${EXPIRING_SOON_DAYS}); fresh = more than ${EXPIRING_SOON_DAYS} days left; no_expiry = no expiry date.`,
        },
        expires_within_days: { type: "INTEGER", description: "Only items expiring from today up to this many days ahead (e.g. 1 for today and tomorrow, 7 for this week)." },
        category: { type: "STRING", description: "Category name or part of it, e.g. Dairy, Bakery, Beverages." },
        search: { type: "STRING", description: "Product name, brand or barcode text." },
        group_by: { type: "STRING", enum: [...GROUP_BY], description: "Group the totals by store or category." },
        limit: { type: "INTEGER", description: "How many items to list (1-30, default 15)." },
      },
    },
  },
  {
    name: "query_employees",
    description: "List employees with code, designation, status (active/inactive), assigned stores and last sign-in. Optionally filter by store, status or name/code/designation.",
    parameters: {
      type: "OBJECT",
      properties: {
        store: storeParam,
        status: { type: "STRING", enum: ["all", "active", "inactive"] },
        search: { type: "STRING", description: "Employee name, code or designation." },
      },
    },
  },
  {
    name: "query_activity",
    description:
      "Stock change history: who added, updated or removed stock, when, in which store, and why (removal reason). Includes counts by action and by person.",
    parameters: {
      type: "OBJECT",
      properties: {
        days: { type: "INTEGER", description: "Look back this many days (1-90, default 7)." },
        action: { type: "STRING", enum: ["all", "added", "updated", "removed", "expired_cleared"] },
        person: { type: "STRING", description: "Employee name or code, or \"Admin\"." },
        store: storeParam,
        limit: { type: "INTEGER", description: "How many changes to list (1-30, default 15)." },
      },
    },
  },
] as const;

export async function executeTool(name: string, args: Args, ctx: ToolContext): Promise<unknown> {
  try {
    switch (name) {
      case "get_overview":
        return await getOverview(ctx);
      case "query_stores":
        return await queryStores(ctx, args);
      case "query_stock":
        return await queryStock(ctx, args);
      case "query_employees":
        return await queryEmployees(ctx, args);
      case "query_activity":
        return await queryActivity(ctx, args);
      default:
        return { error: `Unknown tool ${name}` };
    }
  } catch (error) {
    console.error(`[assistant:tool:${name}] failed`, error);
    return { error: "This data couldn't be loaded right now." };
  }
}
