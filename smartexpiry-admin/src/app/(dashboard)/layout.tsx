import { Suspense, type ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireAdmin } from "@/lib/auth/dal";
import { countExpiryAlerts } from "@/lib/notifications/expiry";

/** Shared signed-in shell for dashboard pages. */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<DashboardShellFallback />}>
      <AuthenticatedDashboardShell>{children}</AuthenticatedDashboardShell>
    </Suspense>
  );
}

/** Keep request-bound auth reads below Suspense so Next can stream the shell. */
async function AuthenticatedDashboardShell({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  // Bell badge: products expiring within 2 days or already expired, across all stores.
  const alertCount = await countExpiryAlerts({ adminId: admin.id }).catch(() => 0);
  return (
    <DashboardShell admin={admin} alertCount={alertCount}>
      {children}
    </DashboardShell>
  );
}

function DashboardShellFallback() {
  return (
    <div className="min-h-dvh animate-pulse lg:flex" aria-hidden>
      <div className="hidden w-72 shrink-0 border-r border-border bg-card lg:block" />
      <div className="flex-1">
        <div className="h-16 border-b border-border bg-card lg:hidden" />
        <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-8 sm:px-6 lg:px-8 lg:pt-9">
          <div className="h-9 w-56 rounded-lg bg-muted" />
          <div className="h-5 w-80 max-w-full rounded-lg bg-muted" />
          <div className="h-48 rounded-2xl bg-muted" />
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 h-16 border-t border-border bg-card lg:hidden" />
    </div>
  );
}
