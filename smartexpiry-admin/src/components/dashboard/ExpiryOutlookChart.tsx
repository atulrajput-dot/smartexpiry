"use client";

import { useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Week = { weekStart: string; weekEnd: string; products: number; units: number };

const short = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** Phones: every other week, as a date ("2 Dec"), so labels never get cut off. */
const shortWeekLabel = (w: Week, i: number) => (i === 0 ? "Now" : short.format(d(w.weekStart)));
const weekLabel = (w: Week, i: number) => (i === 0 ? "This week" : i === 1 ? "Next week" : short.format(d(w.weekStart)));
const weekRange = (w: Week) => `${short.format(d(w.weekStart))} – ${short.format(d(w.weekEnd))}`;

/** Round the axis top up to a clean number with ~4 ticks. */
function niceScale(max: number) {
  if (max <= 4) return { top: 4, step: 1 };
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough)!;
  return { top: Math.ceil(max / step) * step, step };
}

/**
 * Column chart: how many products expire in each of the coming weeks.
 * One series (no legend — the title names it), thin columns from one baseline,
 * hover/focus tooltip per column, and a table view with the same numbers.
 */
export function ExpiryOutlookChart({ weeks }: { weeks: Week[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(...weeks.map((w) => w.products), 0);
  const { top, step } = niceScale(max);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const peak = weeks.findIndex((w) => w.products === max && max > 0);
  const total = weeks.reduce((s, w) => s + w.products, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 className="font-semibold">Upcoming expiries</h2>
          <p className="text-sm text-muted-foreground">
            Products expiring each week · next {weeks.length} weeks · {total} total
          </p>
        </div>
        <div role="radiogroup" aria-label="View" className="inline-flex shrink-0 rounded-lg border border-border bg-muted/50 p-0.5">
          {(
            [
              ["chart", "Chart", BarChart3],
              ["table", "Table", Table2],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={view === key}
              onClick={() => setView(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                view === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-semibold">Week</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Products</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Units</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {weeks.map((w, i) => (
                <tr key={w.weekStart}>
                  <td className="px-3 py-2">
                    {weekLabel(w, i)} <span className="block text-xs text-muted-foreground sm:inline sm:text-sm">· {weekRange(w)}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{w.products}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{number.format(w.units)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : max === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
          <p className="font-medium">Nothing expires in the next {weeks.length} weeks</p>
          <p className="mt-1 text-sm text-muted-foreground">Products you add with expiry dates will show up here.</p>
        </div>
      ) : (
        <div className="flex gap-2 sm:gap-3">
          {/* Y axis */}
          <div className="relative h-52 w-6 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground" aria-hidden>
            {ticks.map((t) => (
              <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
                {t}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative h-52" onMouseLeave={() => setActive(null)}>
              {/* Recessive gridlines */}
              {ticks.map((t) => (
                <div
                  key={t}
                  aria-hidden
                  className={cn("absolute inset-x-0 border-t", t === 0 ? "border-border" : "border-dashed border-border/60")}
                  style={{ bottom: `${(t / top) * 100}%` }}
                />
              ))}

              <div className="absolute inset-0 flex">
                {weeks.map((w, i) => {
                  const h = (w.products / top) * 100;
                  const isActive = active === i;
                  return (
                    <button
                      key={w.weekStart}
                      type="button"
                      aria-label={`${weekLabel(w, i)} (${weekRange(w)}): ${w.products} products, ${number.format(w.units)} units`}
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      className="group relative flex h-full flex-1 cursor-default items-end justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {/* Hover wash over the whole slot = generous hit target */}
                      <span aria-hidden className={cn("absolute inset-x-1 inset-y-0 rounded-md transition-colors", isActive && "bg-muted/60")} />
                      {w.products > 0 && (
                        <span
                          aria-hidden
                          className={cn(
                            "relative w-full max-w-6 rounded-t bg-primary transition-[filter]",
                            isActive && "brightness-110",
                          )}
                          style={{ height: `${h}%` }}
                        >
                          {/* Selective direct label: the peak week only */}
                          {i === peak && !isActive && (
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-foreground">
                              {w.products}
                            </span>
                          )}
                        </span>
                      )}

                      {isActive && (
                        <span
                          role="status"
                          className={cn(
                            "pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-border bg-card px-3 py-2 text-left text-xs shadow-lg",
                            i < 2 ? "left-0" : i >= weeks.length - 2 ? "right-0" : "left-1/2 -translate-x-1/2",
                          )}
                          style={{ bottom: `calc(${Math.max(h, 0)}% + 10px)` }}
                        >
                          <span className="block text-sm font-semibold text-foreground">
                            {w.products} {w.products === 1 ? "product" : "products"}
                          </span>
                          <span className="block text-muted-foreground">
                            {number.format(w.units)} units · {weekRange(w)}
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* X axis */}
            <div className="mt-2 flex text-[11px] text-muted-foreground" aria-hidden>
              {weeks.map((w, i) => (
                <span key={w.weekStart} className="min-w-0 flex-1 whitespace-nowrap text-center sm:truncate">
                  <span className="hidden sm:inline">{weekLabel(w, i)}</span>
                  <span className={cn("sm:hidden", i % 2 === 1 && "invisible")}>{shortWeekLabel(w, i)}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
