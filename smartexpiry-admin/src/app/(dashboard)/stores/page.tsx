import type { Metadata } from "next";
import { Suspense } from "react";
import { StoreManager, type StoreSummary } from "@/components/dashboard/StoreManager";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Stores" };

/**
 * The page itself renders nothing request-specific, so navigating here is
 * instant: the skeleton shows immediately and the store list streams in.
 * (Client navigations only re-render below the dashboard layout, so the
 * layout's own <Suspense> can't cover this page — it needs its own boundary.)
 */
export default function StoresPage() {
  return (
    <Suspense fallback={<StoresSkeleton />}>
      <StoresContent />
    </Suspense>
  );
}

async function StoresContent() {
  const admin = await requireAdmin();
  const [stores, employees] = await Promise.all([
    prisma.store.findMany({
      where: { adminId: admin.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        email: true,
        phone: true,
        address: true,
        country: true,
        state: true,
        city: true,
        pincode: true,
        employees: {
          orderBy: { assignedAt: "asc" },
          select: {
            employee: {
              select: {
                id: true,
                name: true,
                employeeCode: true,
                status: true,
                profileImageType: true,
                updatedAt: true,
                _count: { select: { stores: true } },
              },
            },
          },
        },
      },
    }),
    // Options for the "Assign employees" picker.
    prisma.employee.findMany({
      where: { adminId: admin.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, employeeCode: true, designation: true, status: true },
    }),
  ]);

  const summaries: StoreSummary[] = stores.map(({ employees: links, ...store }) => ({
    ...store,
    employees: links.map(({ employee: e }) => ({
      id: e.id,
      name: e.name,
      employeeCode: e.employeeCode,
      status: e.status,
      avatarUrl: e.profileImageType ? `/api/employees/${e.id}/avatar?v=${e.updatedAt.getTime()}` : null,
      // Works only here → would have no store if this one is deleted.
      onlyThisStore: e._count.stores === 1,
    })),
  }));

  return <StoreManager stores={summaries} employees={employees} />;
}

function StoresSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-9 w-32 rounded-lg bg-muted" />
          <div className="h-4 w-72 max-w-full rounded bg-muted" />
        </div>
        <div className="h-10 w-32 rounded-lg bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
