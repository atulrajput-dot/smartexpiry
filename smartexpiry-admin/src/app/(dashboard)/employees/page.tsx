import type { Metadata } from "next";
import { Suspense } from "react";
import { EmployeeManager } from "@/components/dashboard/EmployeeManager";
import { requireAdmin } from "@/lib/auth/dal";
import { listEmployees, PAGE_SIZES, parseEmployeeQuery } from "@/lib/employees/list";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Employees" };

/**
 * Search, filters and pagination live in the URL (?q=&store=&status=&page=&pageSize=)
 * and are applied in the database query, so only one page of rows is ever loaded.
 * Own Suspense boundary keeps client navigations to this page instant.
 */
export default function EmployeesPage({ searchParams }: PageProps<"/employees">) {
  return (
    <Suspense fallback={<EmployeesSkeleton />}>
      <EmployeesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function EmployeesContent({ searchParams }: { searchParams: PageProps<"/employees">["searchParams"] }) {
  const [admin, params] = await Promise.all([requireAdmin(), searchParams]);
  const query = parseEmployeeQuery(params);

  const [result, stores] = await Promise.all([
    listEmployees(admin.id, query),
    // This admin's stores: options for the store filter and the create dialog.
    prisma.store.findMany({
      where: { adminId: admin.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, city: true },
    }),
  ]);

  return <EmployeeManager result={result} query={query} stores={stores} pageSizes={PAGE_SIZES} />;
}

function EmployeesSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-9 w-40 rounded-lg bg-muted" />
          <div className="h-4 w-72 max-w-full rounded bg-muted" />
        </div>
        <div className="h-10 w-40 rounded-lg bg-muted" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="h-[72px] border-b border-border bg-muted/60" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-16 border-b border-border bg-muted/30" />
        ))}
        <div className="h-[68px] bg-muted/60" />
      </div>
    </div>
  );
}
