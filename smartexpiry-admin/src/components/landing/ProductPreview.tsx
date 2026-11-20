import { BellRing, CircleCheck, IndianRupee, ScanBarcode, Store } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const rows = [
  { name: "Amul Taaza Milk 1 L", meta: "Dairy · 12 pcs", status: "Expires today", tone: "danger" },
  { name: "Brown Bread 400 g", meta: "Bakery · 8 pcs", status: "Tomorrow", tone: "warning" },
  { name: "Fresh Paneer 200 g", meta: "Dairy · 5 pcs", status: "In 5 days", tone: "warning" },
  { name: "Basmati Rice 5 kg", meta: "Grocery · 20 pcs", status: "Fresh", tone: "success" },
] as const;

const toneClass = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
} as const;

/** Static picture of the app for the landing page hero (not live data). */
export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md sm:pt-12 lg:max-w-none" aria-hidden>
      {/* Main card */}
      <div className="relative rounded-3xl border border-border bg-card p-4 shadow-2xl shadow-emerald-900/10 ring-1 ring-black/5 sm:p-5 dark:shadow-black/40">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark className="size-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Fresh Mart</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Store className="size-3" /> MG Road, Indore
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
            <BellRing className="size-3.5" /> 2 alerts
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 py-4 text-center">
          {[
            { label: "Products", value: "248", cls: "text-foreground" },
            { label: "Expiring", value: "14", cls: "text-warning" },
            { label: "Expired", value: "3", cls: "text-danger" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-muted px-2 py-2.5">
              <p className={cn("text-lg font-bold tabular-nums", s.cls)}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.meta}</p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", toneClass[r.tone])}>{r.status}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Floating chips (hidden on very small screens to avoid overflow) */}
      <div className="absolute -left-4 top-0 z-10 hidden items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-xl sm:flex lg:-left-8">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <ScanBarcode className="size-4" />
        </span>
        <div>
          <p className="text-xs font-semibold">Barcode scanned</p>
          <p className="font-mono text-[11px] text-muted-foreground">8901262150118</p>
        </div>
        <CircleCheck className="size-4 text-success" />
      </div>

      <div className="absolute -bottom-6 -right-3 hidden items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-xl sm:flex lg:-right-8">
        <span className="flex size-8 items-center justify-center rounded-lg bg-warning-soft text-warning">
          <IndianRupee className="size-4" />
        </span>
        <div>
          <p className="text-xs font-semibold">₹1,240 at risk</p>
          <p className="text-[11px] text-muted-foreground">Sell or discount this week</p>
        </div>
      </div>
    </div>
  );
}
