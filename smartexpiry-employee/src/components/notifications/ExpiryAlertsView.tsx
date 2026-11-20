import Link from "next/link";
import { BellRing, CalendarClock, CalendarX2, ChevronRight, CircleCheck, IndianRupee, Package, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ExpiryAlert, ExpiryAlerts } from "@/lib/notifications/expiry";
import { ALERT_DAYS } from "@/lib/products/catalog";
import { cn } from "@/lib/utils";

const qty = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const day = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

type Group = { key: string; title: string; hint: string; Icon: LucideIcon; tone: string; chip: string; match: (d: number) => boolean };

const GROUPS: Group[] = [
  { key: "expired", title: "Expired", hint: "Remove from the shelf", Icon: CalendarX2, tone: "text-danger", chip: "bg-danger-soft text-danger", match: (d) => d < 0 },
  { key: "today", title: "Expires today", hint: "Sell or use today", Icon: BellRing, tone: "text-danger", chip: "bg-danger-soft text-danger", match: (d) => d === 0 },
  { key: "tomorrow", title: "Expires tomorrow", hint: "Discount or move it", Icon: CalendarClock, tone: "text-warning", chip: "bg-warning-soft text-warning", match: (d) => d === 1 },
  { key: "soon", title: `In ${ALERT_DAYS} days`, hint: "Plan ahead", Icon: CalendarClock, tone: "text-warning", chip: "bg-warning-soft text-warning", match: (d) => d >= 2 },
];

function whenLabel(d: number) {
  if (d === 0) return "Expires today";
  if (d === 1) return "Expires tomorrow";
  if (d > 1) return `Expires in ${d} days`;
  if (d === -1) return "Expired yesterday";
  return `Expired ${Math.abs(d)} days ago`;
}

/** Summary chips + grouped list of expiry notifications. `showStore` when several stores are involved. */
export function ExpiryAlertsView({ alerts, showStore = true }: { alerts: ExpiryAlerts; showStore?: boolean }) {
  const { items, counts, valueAtRisk } = alerts;

  if (items.length === 0) {
    return (
      <Card className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-success-soft text-success">
          <CircleCheck className="size-7" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold">All clear</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Nothing has expired and nothing expires in the next {ALERT_DAYS} days. New alerts appear here automatically.
        </p>
      </Card>
    );
  }

  const summary: { label: string; value: string; Icon: LucideIcon; chip: string }[] = [
    { label: "Expired", value: String(counts.expired), Icon: CalendarX2, chip: "bg-danger-soft text-danger" },
    { label: "Today", value: String(counts.today), Icon: BellRing, chip: "bg-danger-soft text-danger" },
    { label: "Tomorrow", value: String(counts.tomorrow), Icon: CalendarClock, chip: "bg-warning-soft text-warning" },
    { label: `In ${ALERT_DAYS} days`, value: String(counts.soon), Icon: CalendarClock, chip: "bg-warning-soft text-warning" },
    { label: "Value at risk", value: money.format(valueAtRisk), Icon: IndianRupee, chip: "bg-info-soft text-info" },
  ];

  return (
    <div className="space-y-6">
      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {summary.map((s, i) => (
          <div key={s.label} className={cn("flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm", i === summary.length - 1 && "max-sm:col-span-2")}>
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", s.chip)}>
              <s.Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{s.label}</p>
              <p className="truncate text-xl font-semibold tabular-nums">{s.value}</p>
            </div>
          </div>
        ))}
      </section>
      {valueAtRisk === 0 && (
        <p className="-mt-3 text-xs text-muted-foreground">Add a cost price to products to see how much money is at risk.</p>
      )}

      {GROUPS.map((g) => {
        const list = items.filter((i) => g.match(i.daysLeft));
        if (list.length === 0) return null;
        return (
          <section key={g.key} aria-labelledby={`alerts-${g.key}`} className="space-y-3">
            <div className="flex items-center gap-2">
              <g.Icon className={cn("size-4", g.tone)} aria-hidden />
              <h2 id={`alerts-${g.key}`} className="font-semibold">
                {g.title}
              </h2>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", g.chip)}>{list.length}</span>
              <span className="text-sm text-muted-foreground">· {g.hint}</span>
            </div>
            <Card className="overflow-hidden p-0">
              <ul className="divide-y divide-border">
                {list.map((a) => (
                  <AlertRow key={a.id} alert={a} showStore={showStore} />
                ))}
              </ul>
            </Card>
          </section>
        );
      })}
    </div>
  );
}

function AlertRow({ alert: a, showStore }: { alert: ExpiryAlert; showStore: boolean }) {
  const expired = a.daysLeft < 0;
  const urgent = a.daysLeft <= 0;
  return (
    <li>
      <Link
        href={`/stores/${a.storeId}/products?status=${expired ? "expired" : "expiring"}`}
        className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 sm:gap-4"
      >
        {a.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote product photo
          <img src={a.imageUrl} alt="" className="size-11 shrink-0 rounded-xl border border-border bg-white object-contain p-1" />
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
            <Package className="size-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium group-hover:text-primary">{a.productName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[showStore && `${a.storeName} (${a.storeCode})`, `${qty.format(a.quantity)} ${a.unit}`, a.batch && `Batch ${a.batch}`, a.value !== null && `${money.format(a.value)} at cost`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("text-xs font-semibold", urgent ? "text-danger" : "text-warning")}>{whenLabel(a.daysLeft)}</p>
          <p className="text-xs tabular-nums text-muted-foreground">{day.format(new Date(`${a.expiresOn}T00:00:00Z`))}</p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </li>
  );
}
