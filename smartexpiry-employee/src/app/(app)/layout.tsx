import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";
import { requireEmployee } from "@/lib/auth/dal";
import { countExpiryAlerts } from "@/lib/notifications/expiry";

/** Signed-in area: sidebar on desktop, top bar + bottom navigation on phones. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}

/** Request-bound auth read stays below Suspense so Next can stream the shell. */
async function AuthenticatedShell({ children }: { children: ReactNode }) {
  const employee = await requireEmployee();
  // Bell badge: expiring within 2 days or expired, in this employee's stores only.
  const alertCount = await countExpiryAlerts({ id: { in: employee.stores.map((s) => s.id) } }).catch(() => 0);
  return (
    <AppShell employee={{ name: employee.name, email: employee.email, employeeCode: employee.employeeCode }} alertCount={alertCount}>
      {children}
    </AppShell>
  );
}

function ShellFallback() {
  return (
    <div className="min-h-dvh animate-pulse lg:flex" aria-hidden>
      <div className="hidden w-72 shrink-0 border-r border-border bg-card lg:block" />
      <div className="flex-1">
        <div className="h-16 border-b border-border bg-card lg:hidden" />
        <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-8 sm:px-6 lg:px-8 lg:pt-9">
          <div className="h-9 w-56 rounded-lg bg-muted" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 h-16 border-t border-border bg-card lg:hidden" />
    </div>
  );
}
