import type { Metadata } from "next";
import { WelcomeToast } from "@/components/dashboard/WelcomeToast";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Boxes,
  Building2,
  CalendarClock,
  CalendarX2,
  ChevronRight,
  CircleCheck,
  Plus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ExpiryOutlookChart } from "@/components/dashboard/ExpiryOutlookChart";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/dal";
import { getDashboardSummary, type DashboardSummary } from "@/lib/dashboard/summary";
import { AlertBanner } from "@/components/notifications/AlertBanner";
import { getExpiryAlerts } from "@/lib/notifications/expiry";
import { EXPIRING_SOON_DAYS } from "@/lib/products/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const longDate = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });
const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardContent({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const [admin, params] = await Promise.all([requireAdmin(), searchParams]);
  const [data, alerts] = await Promise.all([getDashboardSummary(admin.id), getExpiryAlerts({ adminId: admin.id })]);
  const { totals } = data;
  const firstName = admin.name.split(" ")[0];

  return (
    <div className="space-y-6">
      {params.welcome === "1" && <WelcomeToast />}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <p className="text-sm font-medium text-primary">{longDate.format(new Date())}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Hello, {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground">
            {totals.expired + totals.expiringSoon > 0
              ? `${totals.expired} expired and ${totals.expiringSoon} expiring products need attention across your stores.`
              : "Here's how your stores are doing today."}
          </p>
        </div>
      </div>

      <AlertBanner alerts={alerts} />

      {/* KPI tiles */}
      <section aria-label="Overview" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatTile href="/stores" label="Stores" value={totals.stores} note={totals.stores === 1 ? "1 location" : `${totals.stores} locations`} Icon={Building2} tone="bg-secondary text-primary" />
        <StatTile href="/employees" label="Employees" value={totals.employees} note={`${totals.activeEmployees} active`} Icon={Users} tone="bg-info-soft text-info" />
        <StatTile className="max-sm:col-span-2" label="Products in stock" value={totals.products} note={`${number.format(totals.units)} units`} Icon={Boxes} tone="bg-secondary text-primary" />
        <StatTile label="Expiring soon" value={totals.expiringSoon} note={`Next ${EXPIRING_SOON_DAYS} days · ${number.format(totals.expiringSoonUnits)} units`} Icon={CalendarClock} tone="bg-warning-soft text-warning" />
        <StatTile label="Expired" value={totals.expired} note={`${number.format(totals.expiredUnits)} units to remove`} Icon={CalendarX2} tone="bg-danger-soft text-danger" />
      </section>

      {totals.stores === 0 ? (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Building2 className="size-6" aria-hidden />
          </span>
          <h2 className="text-lg font-semibold">Create your first store</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Add a store, then scan or enter its products. Expiry insights for all your stores will appear here.
          </p>
          <Link href="/stores" className={cn(buttonVariants(), "mt-5")}>
            <Plus className="size-4" aria-hidden /> Go to Stores
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <Card className="min-w-0 max-sm:p-4 xl:col-span-3">
              <ExpiryOutlookChart weeks={data.outlook} />
            </Card>
            <NeedsAttention items={data.attention} />
          </div>
          <StoresAtAGlance stores={data.stores} />
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────── Pieces ─────────────────────────────── */

function StatTile({ href, label, value, note, Icon, tone, className }: { href?: string; label: string; value: number; note: string; Icon: LucideIcon; tone: string; className?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className={cn("flex size-9 items-center justify-center rounded-xl sm:size-10", tone)}>
          <Icon className="size-4.5 sm:size-5" aria-hidden />
        </span>
        {href && <ArrowRight className="size-4 text-muted-foreground transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />}
      </div>
      <p className="mt-3 text-sm text-muted-foreground sm:mt-4">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold sm:text-3xl">{number.format(value)}</p>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">{note}</p>
    </>
  );
  const base = cn("min-w-0 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5", className);
  return href ? (
    <Link href={href} className={cn(base, "group transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}

function daysLabel(daysLeft: number) {
  if (daysLeft === 0) return "Expires today";
  if (daysLeft === 1) return "Tomorrow";
  if (daysLeft > 1) return `In ${daysLeft} days`;
  if (daysLeft === -1) return "Expired yesterday";
  return `Expired ${Math.abs(daysLeft)} days ago`;
}

function NeedsAttention({ items }: { items: DashboardSummary["attention"] }) {
  return (
    <Card className="flex min-w-0 flex-col gap-4 max-sm:p-4 xl:col-span-2">
      <div>
        <h2 className="font-semibold">Needs attention</h2>
        <p className="text-sm text-muted-foreground">Expired and soonest-to-expire stock across all stores</p>
      </div>
      {items.length ? (
        <ul className="-mx-2 divide-y divide-border">
          {items.map((it) => {
            const expired = it.status === "expired";
            return (
              <li key={it.id}>
                <Link
                  href={`/stores/${it.storeId}/products?status=${expired ? "expired" : "expiring"}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
                >
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", expired ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning")}>
                    {expired ? <CalendarX2 className="size-4" aria-hidden /> : <CalendarClock className="size-4" aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{it.productName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {it.storeName} · {number.format(it.quantity)} {it.unit}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={cn("block text-xs font-medium", expired ? "text-danger" : "text-warning")}>{daysLabel(it.daysLeft)}</span>
                    <span className="block text-xs tabular-nums text-muted-foreground">{shortDate.format(new Date(`${it.expiresOn}T00:00:00Z`))}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <CircleCheck className="mb-2 size-7 text-success" aria-hidden />
          <p className="font-medium">All clear</p>
          <p className="mt-1 text-sm text-muted-foreground">Nothing expired or expiring in the next {EXPIRING_SOON_DAYS} days.</p>
        </div>
      )}
    </Card>
  );
}

function Count({ value, tone }: { value: number; tone?: "warning" | "danger" }) {
  if (value === 0) return <span className="text-muted-foreground">0</span>;
  return (
    <span className={cn("inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-xs font-semibold", tone === "danger" ? "bg-danger-soft text-danger" : tone === "warning" ? "bg-warning-soft text-warning" : "text-foreground")}>
      {value}
    </span>
  );
}

function StoresAtAGlance({ stores }: { stores: DashboardSummary["stores"] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-4 p-4 pb-3 sm:p-5 sm:pb-4">
        <div>
          <h2 className="font-semibold">Stores at a glance</h2>
          <p className="text-sm text-muted-foreground">Stock and expiry status per store</p>
        </div>
        <Link href="/stores" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          All stores <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>

      {/* Phones: compact list */}
      <ul className="divide-y divide-border border-t border-border sm:hidden">
        {stores.map((s) => (
          <li key={s.id}>
            <Link href={`/stores/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{s.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {s.products} products · {s.employees} employees
                </span>
              </span>
              <span className="flex gap-1.5">
                <Count value={s.expiringSoon} tone="warning" />
                <Count value={s.expired} tone="danger" />
              </span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead className="border-y border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-5 py-3 text-left font-semibold">Store</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Products</th>
              <th scope="col" className="px-4 py-3 text-center font-semibold">Expiring soon</th>
              <th scope="col" className="px-4 py-3 text-center font-semibold">Expired</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Employees</th>
              <th scope="col" className="w-10 px-4 py-3"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {stores.map((s) => (
              <tr key={s.id} className="group relative transition-colors hover:bg-muted/40">
                <td className="px-5 py-3">
                  <Link href={`/stores/${s.id}`} className="font-medium after:absolute after:inset-0 after:content-[''] group-hover:text-primary">
                    {s.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{s.code}</span> · {s.city}
                  </p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{s.products}</td>
                <td className="px-4 py-3 text-center"><Count value={s.expiringSoon} tone="warning" /></td>
                <td className="px-4 py-3 text-center"><Count value={s.expired} tone="danger" /></td>
                <td className="px-4 py-3 text-right tabular-nums">{s.employees}</td>
                <td className="px-4 py-3 text-muted-foreground"><ChevronRight className="size-4" aria-hidden /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="space-y-2">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-9 w-64 rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={cn("h-32 rounded-2xl bg-muted sm:h-36", i === 2 && "max-sm:col-span-2")} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="h-80 rounded-2xl bg-muted xl:col-span-3" />
        <div className="h-80 rounded-2xl bg-muted xl:col-span-2" />
      </div>
      <div className="h-56 rounded-2xl bg-muted" />
    </div>
  );
}
