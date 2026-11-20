/** Product form options and expiry rules shared by UI and server. */

export const PRODUCT_CATEGORIES = [
  "Dairy",
  "Bakery",
  "Beverages",
  "Snacks",
  "Fruits & vegetables",
  "Meat, fish & eggs",
  "Frozen",
  "Pantry",
  "Medicines",
  "Personal care",
  "Household",
  "Other",
] as const;

export const PRODUCT_UNITS = ["pcs", "packs", "boxes", "bottles", "cans", "jars", "bags", "tubes", "strips", "kg", "g", "L", "ml"] as const;

/** Categories that usually spoil quickly (default product type = perishable). */
const PERISHABLE = new Set<string>(["Dairy", "Bakery", "Fruits & vegetables", "Meat, fish & eggs", "Frozen"]);
export const isPerishableCategory = (category: string) => PERISHABLE.has(category);

/** Stock within this many days of its expiry date counts as "expiring soon". */
export const EXPIRING_SOON_DAYS = 7;

export type ExpiryStatus = "fresh" | "expiring" | "expired" | "none";

/** Products expiring within this many days (or already expired) appear in Notifications. */
export const ALERT_DAYS = 2;

/** Why stock was removed. Recorded in the activity history. */
export const REMOVAL_REASONS = [
  { value: "SOLD", label: "Sold / used" },
  { value: "EXPIRED", label: "Expired — thrown away" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "RETURNED", label: "Returned to supplier" },
  { value: "OTHER", label: "Other / correction" },
] as const;
export type RemovalReason = (typeof REMOVAL_REASONS)[number]["value"];
export const isRemovalReason = (v: unknown): v is RemovalReason => REMOVAL_REASONS.some((r) => r.value === v);

/**
 * Today's date as UTC midnight — the same form dates are stored in (@db.Date).
 * Uses APP_TIMEZONE (e.g. "Asia/Kolkata") when set, so "today" matches the
 * stores' calendar even if the server runs in another time zone.
 */
export function todayUtc(now = new Date()) {
  const tz = typeof process !== "undefined" ? process.env.APP_TIMEZONE : undefined;
  if (tz) {
    try {
      const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
        .format(now)
        .split("-")
        .map(Number);
      return new Date(Date.UTC(y!, m! - 1, d!));
    } catch {
      /* invalid zone: fall back to the server's clock */
    }
  }
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** Whole days from today until `expiry` (negative = already expired). */
export function daysUntil(expiry: Date, today = todayUtc()) {
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
}

export function expiryStatus(daysLeft: number | null): ExpiryStatus {
  if (daysLeft === null) return "none";
  if (daysLeft < 0) return "expired";
  if (daysLeft <= EXPIRING_SOON_DAYS) return "expiring";
  return "fresh";
}

/** "YYYY-MM-DD" → Date at UTC midnight (how Prisma stores @db.Date). */
export function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00Z`);
}
