import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Who performed an action. Names are copied into the log so history stays readable. */
export type Actor =
  | { kind: "admin"; id: string; name: string }
  | { kind: "employee"; id: string; name: string; code: string };

export type ActivityEntry = {
  /** The company (admin) the store belongs to. */
  adminId: string;
  action: "STOCK_ADDED" | "STOCK_UPDATED" | "STOCK_REMOVED" | "EXPIRED_CLEARED";
  reason?: "SOLD" | "EXPIRED" | "DAMAGED" | "RETURNED" | "OTHER" | null;
  storeId: string | null;
  storeName: string;
  productName: string;
  unit?: string | null;
  quantity?: number | null;
  details?: string | null;
};

type Client = Pick<Prisma.TransactionClient, "activityLog"> | typeof prisma;

/** Writes one or more history rows (inside the caller's transaction when given `tx`). */
export async function logActivity(actor: Actor, entries: ActivityEntry[], client: Client = prisma) {
  if (entries.length === 0) return;
  await client.activityLog.createMany({
    data: entries.map((e) => ({
      adminId: e.adminId,
      action: e.action,
      reason: e.reason ?? null,
      actorAdminId: actor.kind === "admin" ? actor.id : null,
      actorEmployeeId: actor.kind === "employee" ? actor.id : null,
      actorName: actor.name.slice(0, 80),
      actorLabel: actor.kind === "admin" ? "Admin" : actor.code,
      storeId: e.storeId,
      storeName: e.storeName.slice(0, 120),
      productName: e.productName.slice(0, 160),
      unit: e.unit ?? null,
      quantity: e.quantity ?? null,
      details: e.details ? e.details.slice(0, 500) : null,
    })),
  });
}
