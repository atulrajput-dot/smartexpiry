import { Minus, PackagePlus, Pencil, ScrollText, Trash2, type LucideIcon } from "lucide-react";
import type { ActivityActionKey, ActivityRow } from "@/lib/activity/list";
import { REMOVAL_REASONS } from "@/lib/products/catalog";
import { cn } from "@/lib/utils";

const qty = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const when = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: process.env.APP_TIMEZONE || undefined });

export const ACTION_META: Record<ActivityActionKey, { label: string; Icon: LucideIcon; tone: string }> = {
  STOCK_ADDED: { label: "Added stock", Icon: PackagePlus, tone: "bg-success-soft text-success" },
  STOCK_UPDATED: { label: "Edited", Icon: Pencil, tone: "bg-info-soft text-info" },
  STOCK_REMOVED: { label: "Removed", Icon: Minus, tone: "bg-warning-soft text-warning" },
  EXPIRED_CLEARED: { label: "Cleared expired", Icon: Trash2, tone: "bg-danger-soft text-danger" },
};

const reasonLabel = (r: string | null) => REMOVAL_REASONS.find((x) => x.value === r)?.label ?? null;

/** History rows: who did what, to which product, in which store, when. Server component. */
export function ActivityList({ rows, showActor = true, emptyText = "No activity yet." }: { rows: ActivityRow[]; showActor?: boolean; emptyText?: string }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <ScrollText className="mb-3 size-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">{emptyText}</p>
        <p className="mt-1 text-sm text-muted-foreground">Adding, editing and removing stock is recorded here automatically.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => {
        const m = ACTION_META[r.action];
        const reason = reasonLabel(r.reason);
        return (
          <li key={r.id} className="flex gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
            <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl", m.tone)}>
              <m.Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                {showActor && (
                  <>
                    <span className="font-semibold">{r.actorName}</span>{" "}
                    <span className={cn("rounded px-1.5 py-px text-[11px] font-medium", r.isAdmin ? "bg-secondary text-secondary-foreground" : "bg-muted font-mono text-muted-foreground")}>
                      {r.actorLabel}
                    </span>{" "}
                  </>
                )}
                <span className="text-muted-foreground">{m.label.toLowerCase()}</span>{" "}
                <span className="font-medium">{r.productName}</span>
                {r.quantity !== null && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {qty.format(r.quantity)} {r.unit}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {r.storeName}
                {reason && (
                  <>
                    {" "}
                    · <span className="font-medium text-foreground">{reason}</span>
                  </>
                )}
              </p>
              {r.details && r.action !== "STOCK_REMOVED" && r.action !== "EXPIRED_CLEARED" && (
                <p className="mt-1 break-words rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">{r.details}</p>
              )}
            </div>
            <time dateTime={r.at} className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {when.format(new Date(r.at))}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
