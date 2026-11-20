import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

/** Admin-scoped totals and expiry outlook for the dashboard. */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setUTCDate(endDate.getUTCDate() + 6);

  const inventoryScope = {
    store: { adminId: admin.id },
    product: { adminId: admin.id, tracksExpiry: true },
    quantityRemaining: { gt: 0 },
    expiryDate: { gte: today, lte: endDate },
  } as const;

  const [storeCount, employeeCount, productCount, expiringBatches, expiredBatchCount] =
    await Promise.all([
      prisma.store.count({ where: { adminId: admin.id } }),
      prisma.employee.count({ where: { adminId: admin.id } }),
      prisma.product.count({ where: { adminId: admin.id } }),
      prisma.inventoryBatch.findMany({
        where: inventoryScope,
        orderBy: [{ expiryDate: "asc" }, { quantityRemaining: "desc" }],
        select: {
          id: true,
          expiryDate: true,
          quantityRemaining: true,
          product: { select: { name: true, unit: true } },
          store: { select: { id: true, name: true } },
        },
      }),
      prisma.inventoryBatch.count({
        where: {
          store: { adminId: admin.id },
          product: { adminId: admin.id, tracksExpiry: true },
          quantityRemaining: { gt: 0 },
          expiryDate: { lt: today },
        },
      }),
    ]);

  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    const batches = expiringBatches.filter((batch) => batch.expiryDate?.toISOString().slice(0, 10) === key);
    return {
      date: key,
      label: new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" }).format(date),
      batches: batches.length,
      units: batches.reduce((sum, batch) => sum + Number(batch.quantityRemaining), 0),
    };
  });

  const soonProductIds = new Set(expiringBatches.map((batch) => batch.product.name));
  return NextResponse.json(
    {
      totals: {
        stores: storeCount,
        employees: employeeCount,
        products: productCount,
        expiringSoon: soonProductIds.size,
        expiringBatches: expiringBatches.length,
        expiredBatches: expiredBatchCount,
      },
      expiryByDay: buckets,
      upcoming: expiringBatches.slice(0, 6).map((batch) => ({
        id: batch.id,
        product: batch.product.name,
        store: batch.store.name,
        storeId: batch.store.id,
        expiryDate: batch.expiryDate?.toISOString().slice(0, 10) ?? null,
        quantity: Number(batch.quantityRemaining),
        unit: batch.product.unit,
      })),
      asOf: today.toISOString(),
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
