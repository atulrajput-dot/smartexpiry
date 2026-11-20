import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Building2,
  CalendarClock,
  CalendarX2,
  ChevronRight,
  MapPin,
  Phone,
  Users,
  type LucideIcon,
} from "lucide-react";
import { StoreDetailActions } from "@/components/dashboard/stores/StoreDetailActions";
import { AddProductPanel } from "@/components/products/AddProductPanel";
import { requireAdmin } from "@/lib/auth/dal";
import { getStoreInventory } from "@/lib/inventory/store-inventory";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Store details" };

const number = new Intl.NumberFormat("en-IN");

/** Own Suspense boundary so navigating here from the store list is instant. */
export default function StoreDetailPage({ params }: PageProps<"/stores/[storeId]">) {
  return (
    <Suspense fallback={<StoreDetailSkeleton />}>
      <StoreDetailContent params={params} />
    </Suspense>
  );
}

async function StoreDetailContent({ params }: { params: PageProps<"/stores/[storeId]">["params"] }) {
  const [admin, { storeId }] = await Promise.all([requireAdmin(), params]);

  const [store, allEmployees] = await Promise.all([
    // Scoped to the signed-in admin: another admin's store id is a 404.
    prisma.store.findFirst({
      where: { id: storeId, adminId: admin.id },
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
          select: { employee: { select: { id: true, name: true, status: true, _count: { select: { stores: true } } } } },
        },
      },
    }),
    prisma.employee.findMany({
      where: { adminId: admin.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, employeeCode: true, designation: true, status: true },
    }),
  ]);
  if (!store) notFound();

  const employees = store.employees.map((l) => l.employee);
  const activeEmployees = employees.filter((e) => e.status === "ACTIVE").length;

  const { summary } = await getStoreInventory(store.id);
  const productsHref = `/stores/${store.id}/products`;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/stores" className="inline-flex items-center gap-1.5 rounded-md hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          Stores
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="truncate text-foreground">{store.name}</span>
      </nav>

      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div aria-hidden className="h-12 bg-linear-to-r from-brand-from to-brand-to" />
        <div className="px-5 pb-4 sm:px-6">
          {/* Only the icon overlaps the banner; name and buttons sit on the card surface for contrast. */}
          <span className="-mt-7 flex size-14 items-center justify-center rounded-xl border-4 border-card bg-secondary text-primary shadow-sm">
            <Building2 className="size-6" aria-hidden />
          </span>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold tracking-tight sm:text-2xl">{store.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-medium">{store.code}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {store.address}, {store.city}, {store.state} {store.pincode}
              </span>
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3.5" aria-hidden />
                {store.phone}
              </span>
            </div>
          </div>
          <StoreDetailActions
            store={{ ...store, employees: employees.map((e) => ({ id: e.id })) }}
            employees={allEmployees}
            onlyHereEmployees={employees.filter((e) => e._count.stores === 1).map((e) => e.name)}
          />
          </div>
        </div>
      </section>

      {/* Clickable stat tiles */}
      <section aria-label="Overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          href={productsHref}
          label="Total products"
          value={number.format(summary.totalProducts)}
          note={`${number.format(summary.totalUnits)} units in stock`}
          Icon={Boxes}
          tone="bg-secondary text-primary"
        />
        <StatTile
          href={`${productsHref}?status=expiring`}
          label="Expiring soon"
          value={number.format(summary.expiring)}
          note={`${number.format(summary.expiringUnits)} units to sell or move`}
          Icon={CalendarClock}
          tone="bg-warning-soft text-warning"
        />
        <StatTile
          href={`${productsHref}?status=expired`}
          label="Expired"
          value={number.format(summary.expired)}
          note={`${number.format(summary.expiredUnits)} units to remove`}
          Icon={CalendarX2}
          tone="bg-danger-soft text-danger"
        />
        <StatTile
          href={`/employees?store=${store.id}`}
          label="Employees"
          value={number.format(employees.length)}
          note={employees.length ? `${activeEmployees} active` : "None assigned yet"}
          Icon={Users}
          tone="bg-info-soft text-info"
        />
      </section>

      <AddProductPanel storeId={store.id} storeName={store.name} />
    </div>
  );
}

function StatTile({
  href,
  label,
  value,
  note,
  Icon,
  tone,
}: {
  href: string;
  label: string;
  value: string;
  note: string;
  Icon: LucideIcon;
  tone: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tone)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
      </div>
      <ArrowRight
        className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-primary"
        aria-hidden
      />
    </Link>
  );
}

function StoreDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="h-5 w-40 rounded bg-muted" />
      <div className="h-36 rounded-2xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
