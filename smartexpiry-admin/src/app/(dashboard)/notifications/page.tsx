import type { Metadata } from "next";
import { Suspense } from "react";
import { ExpiryAlertsView } from "@/components/notifications/ExpiryAlertsView";
import { requireAdmin } from "@/lib/auth/dal";
import { getExpiryAlerts } from "@/lib/notifications/expiry";
import { ALERT_DAYS } from "@/lib/products/catalog";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Products that expire within {ALERT_DAYS} days, and expired stock still in your stores. Alerts start {ALERT_DAYS} days before
          the expiry date.
        </p>
      </div>
      <Suspense fallback={<AlertsSkeleton />}>
        <Alerts />
      </Suspense>
    </div>
  );
}

async function Alerts() {
  const admin = await requireAdmin();
  const alerts = await getExpiryAlerts({ adminId: admin.id });
  return <ExpiryAlertsView alerts={alerts} />;
}

function AlertsSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[70px] rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-muted" />
    </div>
  );
}
