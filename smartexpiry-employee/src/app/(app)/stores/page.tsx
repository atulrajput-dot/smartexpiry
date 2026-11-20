import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Boxes, Building2, CalendarClock, CalendarX2, MapPin, Phone, Store, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { requireEmployee } from "@/lib/auth/dal";
import { EXPIRING_SOON_DAYS } from "@/lib/products/catalog";
import { getEmployeeStoreStats, type StoreCounts } from "@/lib/stores/stats";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Stores" };

export default function StoresPage() {
  return (
    <Suspense fallback={<StoresSkeleton />}>
      <StoresContent />
    </Suspense>
  );
}

async function StoresContent() {
  const me = await requireEmployee();
  const { perStore } = await getEmployeeStoreStats(me.stores.map((s) => s.id));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My stores</h1>
        <p className="text-sm text-muted-foreground">
          {me.stores.length === 0
            ? "Stores your admin assigns to you will appear here."
            : `You're assigned to ${me.stores.length === 1 ? "1 store" : `${me.stores.length} stores`}. Expiring soon = within ${EXPIRING_SOON_DAYS} days.`}
        </p>
      </div>

      {me.stores.length === 0 ? (
        <Card className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Building2 className="size-6" aria-hidden />
          </span>
          <h2 className="font-semibold">No store assigned yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Ask your admin to assign you to a store in SmartExpiry Admin.</p>
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {me.stores.map((s) => {
            const c: StoreCounts = perStore[s.id] ?? { products: 0, expiringSoon: 0, expired: 0 };
            return (
              <li key={s.id}>
                <Link
                  href={`/stores/${s.id}`}
                  aria-label={`Open ${s.name}`}
                  className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                <Card className="flex h-full flex-col gap-4 p-5 transition-[border-color,box-shadow,transform] duration-150 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-brand-from to-brand-to text-white">
                      <Store className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-semibold group-hover:text-primary">{s.name}</h2>
                      <p className="font-mono text-xs text-muted-foreground">{s.code}</p>
                    </div>
                    <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                  </div>

                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                      <span className="min-w-0">
                        {s.address}, {s.city}, {s.state} {s.pincode}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="size-4 shrink-0" aria-hidden />
                      {s.phone}
                    </p>
                  </div>

                  <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-4">
                    <Count label="Products" value={c.products} Icon={Boxes} tone="text-info" />
                    <Count label="Expiring soon" short="Expiring" value={c.expiringSoon} Icon={CalendarClock} tone="text-warning" />
                    <Count label="Expired" value={c.expired} Icon={CalendarX2} tone="text-danger" />
                  </dl>
                </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Count({ label, short, value, Icon, tone }: { label: string; short?: string; value: number; Icon: LucideIcon; tone: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/60 px-2.5 py-2">
      <dt className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        <Icon className={cn("size-3.5 shrink-0", value > 0 ? tone : "")} aria-hidden />
        {short ? (
          <>
            <span className="truncate sm:hidden">{short}</span>
            <span className="hidden truncate sm:inline">{label}</span>
          </>
        ) : (
          <span className="truncate">{label}</span>
        )}
      </dt>
      <dd className={cn("mt-0.5 text-lg font-semibold tabular-nums", value > 0 && label !== "Products" ? tone : "")}>{value}</dd>
    </div>
  );
}

function StoresSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="h-9 w-48 rounded-lg bg-muted" />
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-64 rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
