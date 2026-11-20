import type { Metadata } from "next";
import { Suspense } from "react";
import { ExpiryAlertsView } from "@/components/notifications/ExpiryAlertsView";
import { requireEmployee } from "@/lib/auth/dal";
import { getExpiryAlerts } from "@/lib/notifications/expiry";
import { ALERT_DAYS } from "@/lib/products/catalog";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Products in your stores that expire within {ALERT_DAYS} days, and expired stock to remove from the shelf.
        </p>
      </div>
      <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-muted" aria-hidden />}>
        <Alerts />
      </Suspense>
    </div>
  );
}

async function Alerts() {
  const me = await requireEmployee();
  // Only the stores this employee is assigned to.
  const alerts = await getExpiryAlerts({ id: { in: me.stores.map((s) => s.id) } });
  return <ExpiryAlertsView alerts={alerts} showStore={me.stores.length > 1} />;
}
