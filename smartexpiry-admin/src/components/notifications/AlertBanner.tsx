import Link from "next/link";
import { ArrowRight, BellRing } from "lucide-react";
import type { ExpiryAlerts } from "@/lib/notifications/expiry";
import { ALERT_DAYS } from "@/lib/products/catalog";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** "3 expired · 4 expiring within 2 days · ₹1,250 at cost → View" — shown only when something needs attention. */
export function AlertBanner({ alerts }: { alerts: ExpiryAlerts }) {
  const { counts, valueAtRisk } = alerts;
  const soon = counts.today + counts.tomorrow + counts.soon;
  if (counts.expired + soon === 0) return null;
  const parts = [
    counts.expired > 0 && `${counts.expired} expired`,
    soon > 0 && `${soon} expiring within ${ALERT_DAYS} days`,
    valueAtRisk > 0 && `${money.format(valueAtRisk)} at cost`,
  ].filter(Boolean);
  return (
    <Link
      href="/notifications"
      className="group flex items-center gap-3 rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm transition-colors hover:border-danger/50"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-danger text-danger-foreground">
        <BellRing className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-danger">Needs attention now</span>
        <span className="block text-foreground/80">{parts.join(" · ")}</span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 font-medium text-danger sm:inline-flex">
        View notifications <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
      <ArrowRight className="size-4 shrink-0 text-danger sm:hidden" aria-hidden />
    </Link>
  );
}
