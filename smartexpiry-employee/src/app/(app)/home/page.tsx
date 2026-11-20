import type { Metadata } from "next";
import { Suspense } from "react";
import { Boxes, CalendarClock, CalendarX2, Store } from "lucide-react";
import { StatTile } from "@/components/app/StatTile";
import { AddProductPanel } from "@/components/products/AddProductPanel";
import { requireEmployee } from "@/lib/auth/dal";
import { getEmployeeStoreStats } from "@/lib/stores/stats";
import { AlertBanner } from "@/components/notifications/AlertBanner";
import { getExpiryAlerts } from "@/lib/notifications/expiry";

export const metadata: Metadata = { title: "Home" };

const longDate = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const me = await requireEmployee();
  const storeIds = me.stores.map((s) => s.id);
  const [{ totals }, alerts] = await Promise.all([getEmployeeStoreStats(storeIds), getExpiryAlerts({ id: { in: storeIds } })]);
  const firstName = me.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-medium text-primary">{longDate.format(new Date())}</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Hello, {firstName} 👋</h1>
        <p className="text-sm text-muted-foreground">
          {totals.stores === 0
            ? "You're not assigned to a store yet. Ask your admin to add you to one."
            : `Totals across the ${totals.stores === 1 ? "store" : `${totals.stores} stores`} you work in.`}
        </p>
      </div>

      <AlertBanner alerts={alerts} />

      <section aria-label="Overview" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile label="My stores" value={totals.stores} Icon={Store} tone="bg-secondary text-primary" href="/stores" />
        <StatTile label="Products in stock" value={totals.products} Icon={Boxes} tone="bg-info-soft text-info" />
        <StatTile label="Expiring soon" value={totals.expiringSoon} Icon={CalendarClock} tone="bg-warning-soft text-warning" />
        <StatTile label="Expired" value={totals.expired} Icon={CalendarX2} tone="bg-danger-soft text-danger" />
      </section>

      <AddProductPanel stores={me.stores.map((s) => ({ id: s.id, name: s.name, code: s.code, city: s.city }))} />
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="space-y-2">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-9 w-64 rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
