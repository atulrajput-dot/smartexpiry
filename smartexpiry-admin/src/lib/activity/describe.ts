/** Turns before/after values of an edited stock row into "Quantity 12 → 8 · Expiry 21 Nov → 25 Nov". */

type Snapshot = {
  name: string;
  brand: string | null;
  category: string;
  unit: string;
  quantity: number;
  batchNumber: string | null;
  manufacturingDate: Date | null;
  expiryDate: Date | null;
  costPrice: number | null;
  sellingPrice: number | null;
};

const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const fmtDate = (d: Date | null) => (d ? day.format(d) : "none");

/** "2026-11-26" → "26 Nov 2026". */
export const formatDay = (iso: string) => day.format(new Date(`${iso}T00:00:00Z`));
const fmtText = (v: string | null) => (v ? v : "none");
const fmtMoney = (v: number | null) => (v === null ? "none" : `₹${num.format(v)}`);

export function describeChanges(before: Snapshot, after: Snapshot): string {
  const out: string[] = [];
  const add = (label: string, a: string, b: string) => {
    if (a !== b) out.push(`${label} ${a} → ${b}`);
  };
  add("Name", before.name, after.name);
  add("Brand", fmtText(before.brand), fmtText(after.brand));
  add("Category", before.category, after.category);
  add("Unit", before.unit, after.unit);
  add("Quantity", num.format(before.quantity), num.format(after.quantity));
  add("Batch", fmtText(before.batchNumber), fmtText(after.batchNumber));
  add("Mfg", fmtDate(before.manufacturingDate), fmtDate(after.manufacturingDate));
  add("Expiry", fmtDate(before.expiryDate), fmtDate(after.expiryDate));
  add("Cost", fmtMoney(before.costPrice), fmtMoney(after.costPrice));
  add("Price", fmtMoney(before.sellingPrice), fmtMoney(after.sellingPrice));
  return out.length ? out.join(" · ") : "No changes";
}
