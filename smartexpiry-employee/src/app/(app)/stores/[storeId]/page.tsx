import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight, Boxes, CalendarClock, CalendarX2, ChevronRight, CircleCheck, MapPin, Phone, Store, type LucideIcon } from "lucide-react";
import { AddProductPanel } from "@/components/products/AddProductPanel";
import { requireEmployee } from "@/lib/auth/dal";
import { getStoreInventory } from "@/lib/inventory/store-inventory";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Store details" };

const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** Own Suspense boundary so navigating here from My stores is instant. */
export default function StoreDetailPage({ params }: PageProps<"/stores/[storeId]">) {
  return (
    <Suspense fallback={<StoreDetailSkeleton />}>
      <StoreDetailContent params={params} />
    </Suspense>
  );
}

async function StoreDetailContent({ params }: { params: PageProps<"/stores/[storeId]">["params"] }) {
  const [me, { storeId }] = await Promise.all([requireEmployee(), params]);

  // Only stores this employee is assigned to; any other id is a 404.
  const store = me.stores.find((s) => s.id === storeId);
  if (!store) notFound();

  const { summary } = await getStoreInventory(store.id);
  const productsHref = `/stores/${store.id}/products`;

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/stores" className="inline-flex items-center gap-1.5 rounded-md hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          My stores
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="truncate text-foreground">{store.name}</span>
      </nav>

      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div aria-hidden className="h-12 bg-linear-to-r from-brand-from to-brand-to" />
        <div className="px-5 pb-4 sm:px-6">
          <span className="-mt-7 flex size-14 items-center justify-center rounded-xl border-4 border-card bg-secondary text-primary shadow-sm">
            <Store className="size-6" aria-hidden />
          </span>
          <div className="mt-2 min-w-0">
            <h1 className="break-words text-xl font-semibold tracking-tight sm:text-2xl">{store.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-medium">{store.code}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {store.address}, {store.city}, {store.state} {store.pincode}
              </span>
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3.5" aria-hidden />
                {store.phone}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Clickable stat tiles → product list, filtered */}
      <section aria-label="Overview" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile href={productsHref} label="Total products" value={summary.totalProducts} note={`${number.format(summary.totalUnits)} units in stock`} Icon={Boxes} tone="bg-secondary text-primary" />
        <StatTile href={`${productsHref}?status=fresh`} label="Fresh" value={summary.fresh} note="More than a week left" Icon={CircleCheck} tone="bg-success-soft text-success" />
        <StatTile href={`${productsHref}?status=expiring`} label="Expiring soon" value={summary.expiring} note={`${number.format(summary.expiringUnits)} units to sell or move`} Icon={CalendarClock} tone="bg-warning-soft text-warning" />
        <StatTile href={`${productsHref}?status=expired`} label="Expired" value={summary.expired} note={`${number.format(summary.expiredUnits)} units to remove`} Icon={CalendarX2} tone="bg-danger-soft text-danger" />
      </section>

      {/* Only this store, so it's preselected in the dialog */}
      <AddProductPanel stores={[{ id: store.id, name: store.name, code: store.code, city: store.city }]} />
    </div>
  );
}

function StatTile({ href, label, value, note, Icon, tone }: { href: string; label: string; value: number; note: string; Icon: LucideIcon; tone: string }) {
  return (
    <Link
      href={href}
      className="group relative flex min-w-0 flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:gap-4 sm:p-5"
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tone)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums">{number.format(value)}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{note}</p>
      </div>
      <ArrowRight className="absolute right-4 top-4 size-4 shrink-0 text-muted-foreground sm:static sm:mt-0.5 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
    </Link>
  );
}

function StoreDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="h-5 w-40 rounded bg-muted" />
      <div className="h-36 rounded-2xl bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-muted sm:h-28" />
        ))}
      </div>
    </div>
  );
}
