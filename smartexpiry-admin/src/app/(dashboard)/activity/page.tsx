import type { Metadata } from "next";
import { Suspense } from "react";
import { ActivityFilters, ActivityPagination } from "@/components/activity/ActivityFilters";
import { ActivityList } from "@/components/activity/ActivityList";
import { Card } from "@/components/ui/Card";
import { listActivity, parseActivityQuery, ACTIVITY_PAGE_SIZE } from "@/lib/activity/list";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage({ searchParams }: PageProps<"/activity">) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Every stock change in your stores: who added, edited or removed what, when, and why.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" aria-hidden />}>
        <ActivityContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ActivityContent({ searchParams }: { searchParams: PageProps<"/activity">["searchParams"] }) {
  const [admin, sp] = await Promise.all([requireAdmin(), searchParams]);
  const query = parseActivityQuery(sp);
  const [result, stores, employees] = await Promise.all([
    listActivity(admin.id, query),
    prisma.store.findMany({ where: { adminId: admin.id }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
    prisma.employee.findMany({ where: { adminId: admin.id }, orderBy: { name: "asc" }, select: { id: true, name: true, employeeCode: true } }),
  ]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border p-4">
        <ActivityFilters
          stores={stores.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
          people={employees.map((e) => ({ value: e.id, label: `${e.name} (${e.employeeCode})` }))}
          value={{ store: query.store, person: query.person, action: query.action }}
        />
      </div>
      <ActivityList rows={result.rows} emptyText={query.store || query.person || query.action ? "Nothing matches these filters" : "No activity yet"} />
      {result.total > 0 && (
        <div className="border-t border-border p-4">
          <ActivityPagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={ACTIVITY_PAGE_SIZE} />
        </div>
      )}
    </Card>
  );
}
