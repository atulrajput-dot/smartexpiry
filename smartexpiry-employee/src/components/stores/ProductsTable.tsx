"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CalendarX2,
  Check,
  CircleCheck,
  Infinity as InfinityIcon,
  Minus,
  Package,
  PackageSearch,
  Pencil,
  Search,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { deleteExpiredStockAction, deleteStockAction } from "@/app/(app)/products/actions";
import { EditStockDialog } from "@/components/products/EditStockDialog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { REMOVAL_REASONS, type ExpiryStatus, type RemovalReason } from "@/lib/products/catalog";
import type { InventoryRow } from "@/lib/inventory/store-inventory";

export type ProductTab = "all" | Exclude<ExpiryStatus, "none">;

const PAGE_SIZES = [10, 20, 50] as const;

const STATUS: Record<ExpiryStatus, { label: string; Icon: LucideIcon; badge: string; text: string }> = {
  fresh: { label: "Fresh", Icon: CircleCheck, badge: "bg-success-soft text-success ring-success/25", text: "text-muted-foreground" },
  expiring: { label: "Expiring soon", Icon: CalendarClock, badge: "bg-warning-soft text-warning ring-warning/25", text: "text-warning" },
  expired: { label: "Expired", Icon: CalendarX2, badge: "bg-danger-soft text-danger ring-danger/25", text: "text-danger" },
  none: { label: "No expiry", Icon: InfinityIcon, badge: "bg-muted text-muted-foreground ring-border", text: "text-muted-foreground" },
};

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const qty = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const rupeesPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** ₹40 for whole rupees, ₹42.50 when there are paise. */
const unitPrice = { format: (v: number) => (Number.isInteger(v) ? rupees : rupeesPaise).format(v) };

/** Profit on the selling price as a share of cost, e.g. 37.5 → "+37.5%". */
function margin(p: InventoryRow) {
  if (p.costPrice === null || p.sellingPrice === null || p.costPrice <= 0) return null;
  const pct = Math.round(((p.sellingPrice - p.costPrice) / p.costPrice) * 1000) / 10;
  return { pct, label: `${pct > 0 ? "+" : ""}${pct}% margin` };
}

/** Per-unit prices: "Cost ₹40 · Sell ₹55" (phones). */
const priceLine = (p: InventoryRow) =>
  [p.costPrice !== null && `Cost ${unitPrice.format(p.costPrice)}`, p.sellingPrice !== null && `Sell ${unitPrice.format(p.sellingPrice)}`]
    .filter(Boolean)
    .join(" · ");

function PriceCell({ p }: { p: InventoryRow }) {
  if (p.costPrice === null && p.sellingPrice === null) return <span className="text-xs text-muted-foreground">Not set</span>;
  const m = margin(p);
  return (
    <div className="space-y-0.5 text-xs tabular-nums">
      <p>
        <span className="text-muted-foreground">Cost</span>{" "}
        <span className="font-medium">{p.costPrice !== null ? unitPrice.format(p.costPrice) : "—"}</span>
      </p>
      <p>
        <span className="text-muted-foreground">Sell</span>{" "}
        <span className="font-medium">{p.sellingPrice !== null ? unitPrice.format(p.sellingPrice) : "—"}</span>
      </p>
      {m && <p className={cn("font-medium", m.pct < 0 ? "text-danger" : "text-success")}>{m.label}</p>}
    </div>
  );
}

/** "₹1,240 at cost" for rows with a cost price. */
const stockValue = (p: InventoryRow) => (p.costPrice !== null ? `${money.format(p.quantity * p.costPrice)} at cost` : null);

function daysLabel(daysLeft: number | null) {
  if (daysLeft === null) return "Doesn't expire";
  if (daysLeft === 0) return "Today";
  if (daysLeft === 1) return "Tomorrow";
  if (daysLeft > 1) return `In ${daysLeft} days`;
  if (daysLeft === -1) return "Yesterday";
  return `${Math.abs(daysLeft)} days ago`;
}

const formatExpiry = (p: InventoryRow) => (p.expiresOn ? dateFormat.format(new Date(`${p.expiresOn}T00:00:00Z`)) : "—");

function Thumb({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    // eslint-disable-next-line @next/next/no-img-element -- remote product photo
    <img src={src} alt="" onError={() => setFailed(true)} className="size-11 shrink-0 rounded-xl border border-border bg-white object-contain p-1" />
  ) : (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
      <Package className="size-5" aria-hidden />
    </span>
  );
}

function StatusBadge({ status }: { status: ExpiryStatus }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", s.badge)}>
      <s.Icon className="size-3" aria-hidden />
      {s.label}
    </span>
  );
}

function RowActions({ product, onEdit, onDelete }: { product: InventoryRow; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${product.name}`}
        title="Edit"
        className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${product.name}`}
        title="Delete"
        className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-danger/40 hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function Checkbox({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="relative inline-flex size-4.5 shrink-0 align-middle">
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = !!indeterminate;
        }}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        className={cn(
          "peer size-4.5 cursor-pointer appearance-none rounded-[5px] border-[1.5px] border-muted-foreground/50 bg-card transition-colors",
          "hover:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
          (checked || indeterminate) && "border-primary bg-primary",
        )}
      />
      {(checked || indeterminate) && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-primary-foreground">
          {checked ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : <Minus className="size-3.5" strokeWidth={3} aria-hidden />}
        </span>
      )}
    </span>
  );
}

type Confirm = { kind: "rows"; ids: string[]; title: string; reason: RemovalReason } | { kind: "expired"; count: number };

type Props = {
  storeId: string;
  tab: ProductTab;
  tabs: { key: ProductTab; label: string; count: number }[];
  /** Already filtered to the tab and sorted. */
  products: InventoryRow[];
};

/** Status tabs (links, so a tile can open a tab directly) + search + paginated table. */
export function ProductsTable({ storeId, tab, tabs, products }: Props) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => `${p.name} ${p.brand ?? ""} ${p.category} ${p.batch ?? ""} ${p.barcode ?? ""}`.toLowerCase().includes(q));
  }, [products, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  // Selection survives paging/search; ids that disappear after a refresh drop out.
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const selectedIds = useMemo(() => products.filter((p) => selected.has(p.id)).map((p) => p.id), [products, selected]);
  const pageAllSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const pageSomeSelected = rows.some((r) => selected.has(r.id));
  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const togglePage = (on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of rows) {
        if (on) next.add(r.id);
        else next.delete(r.id);
      }
      return next;
    });

  const expiredCount = tabs.find((t) => t.key === "expired")?.count ?? 0;
  const [editing, setEditing] = useState<InventoryRow | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  /** Expired rows default to "expired"; anything else to "sold / used". */
  const defaultReason = (ids: string[]): RemovalReason =>
    ids.every((id) => products.find((p) => p.id === id)?.status === "expired") ? "EXPIRED" : "SOLD";
  const askDelete = (p: InventoryRow) =>
    setConfirm({ kind: "rows", ids: [p.id], title: `Remove ${p.name}${p.batch ? ` (batch ${p.batch})` : ""}?`, reason: defaultReason([p.id]) });

  async function runDelete() {
    if (!confirm) return;
    setPending(true);
    setConfirmError(null);
    try {
      const res = confirm.kind === "rows" ? await deleteStockAction(storeId, confirm.ids, confirm.reason) : await deleteExpiredStockAction(storeId);
      if (!res.ok) {
        setConfirmError(res.message);
        return;
      }
      const removed = confirm.kind === "rows" ? new Set(confirm.ids) : null;
      setSelected((prev) => (removed ? new Set([...prev].filter((id) => !removed.has(id))) : new Set()));
      toast.success(
        confirm.kind === "expired"
          ? `${res.deleted} expired product${res.deleted === 1 ? "" : "s"} deleted.`
          : `${res.deleted} product${res.deleted === 1 ? "" : "s"} removed.`,
      );
      setConfirm(null);
    } catch {
      setConfirmError("We couldn't delete the products. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
    <Card className="overflow-hidden p-0">
      <div className="space-y-4 border-b border-border p-4">

        <nav aria-label="Filter by status" className="flex flex-wrap gap-1">
          {tabs.map((t) => {
            const active = t.key === tab;
            return (
              <Link
                key={t.key}
                href={t.key === "all" ? `/stores/${storeId}/products` : `/stores/${storeId}/products?status=${t.key}`}
                aria-current={active ? "page" : undefined}
                scroll={false}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t.label}
                <span className={cn("rounded-full px-1.5 py-px text-xs tabular-nums", active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground")}>
                  {t.count}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by product, brand, category, batch or barcode"
            aria-label="Search products"
            className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground shadow-xs placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/20"
          />
        </div>

        {(selectedIds.length > 0 || (expiredCount > 0 && (tab === "all" || tab === "expired"))) && (
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 py-1 pl-3 pr-1">
                <span className="text-sm font-medium tabular-nums">{selectedIds.length} selected</span>
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    setConfirm({
                      kind: "rows",
                      ids: selectedIds,
                      title: `Remove ${selectedIds.length} selected product${selectedIds.length === 1 ? "" : "s"}?`,
                      reason: defaultReason(selectedIds),
                    })
                  }
                >
                  <Trash2 className="size-4" aria-hidden />
                  Delete selected
                </Button>
              </div>
            )}
            {expiredCount > 0 && (tab === "all" || tab === "expired") && (
              <Button variant="outline" size="sm" className="ml-auto border-danger/40 text-danger hover:bg-danger-soft" onClick={() => setConfirm({ kind: "expired", count: expiredCount })}>
                <CalendarX2 className="size-4" aria-hidden />
                Delete all expired ({expiredCount})
              </Button>
            )}
          </div>
        )}
      </div>

      {rows.length ? (
        <>
          {/* Phones: compact list with every field visible */}
          <ul className="divide-y divide-border sm:hidden">
            {rows.map((p) => (
              <li key={p.id} className={cn("flex items-start gap-3 px-4 py-3", selected.has(p.id) && "bg-primary/5")}>
                <span className="flex h-11 items-center">
                  <Checkbox checked={selected.has(p.id)} onChange={(v) => toggle(p.id, v)} label={`Select ${p.name}`} />
                </span>
                <Thumb src={p.imageUrl} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[p.brand, p.category, p.batch && `Batch ${p.batch}`].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-0.5 text-xs">
                    {qty.format(p.quantity)} {p.unit}
                    {stockValue(p) && <span className="text-muted-foreground"> · {stockValue(p)}</span>}
                  </p>
                  {priceLine(p) && <p className="text-xs text-muted-foreground">{priceLine(p)}{margin(p) && ` · ${margin(p)!.label}`}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <StatusBadge status={p.status} />
                  <p className="mt-1 text-xs tabular-nums">{formatExpiry(p)}</p>
                  <p className={cn("text-xs", STATUS[p.status].text)}>{daysLabel(p.daysLeft)}</p>
                  <div className="mt-2">
                    <RowActions product={p} onEdit={() => setEditing(p)} onDelete={() => askDelete(p)} />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[920px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-14" />
                <col />
                <col className="w-32" />
                <col className="w-36" />
                <col className="w-44" />
                <col className="w-40" />
                <col className="w-28" />
              </colgroup>
              <thead className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="py-3 pl-5 pr-2">
                    <Checkbox checked={pageAllSelected} indeterminate={!pageAllSelected && pageSomeSelected} onChange={togglePage} label="Select all products on this page" />
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">Product</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Quantity</th>
                  <th scope="col" className="py-3 pl-6 pr-3 font-semibold">
                    Price <span className="font-normal normal-case tracking-normal">/ unit</span>
                  </th>
                  <th scope="col" className="py-3 pl-8 pr-3 font-semibold">Expiry date</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                  <th scope="col" className="py-3 pl-3 pr-5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((p) => (
                  <tr key={p.id} className={cn("transition-colors hover:bg-muted/40", selected.has(p.id) && "bg-primary/5 hover:bg-primary/10")}>
                    <td className="py-3.5 pl-5 pr-2">
                      <Checkbox checked={selected.has(p.id)} onChange={(v) => toggle(p.id, v)} label={`Select ${p.name}`} />
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <Thumb src={p.imageUrl} />
                        <div className="min-w-0">
                          <p className="truncate font-medium" title={p.name}>
                            {p.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{[p.brand, p.category].filter(Boolean).join(" · ")}</p>
                          {(p.barcode || p.batch) && (
                            <p className="truncate font-mono text-[11px] text-muted-foreground/80">
                              {[p.barcode, p.batch && `Batch ${p.batch}`].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right tabular-nums">
                      <span className="font-medium">{qty.format(p.quantity)}</span> <span className="text-muted-foreground">{p.unit}</span>
                      {stockValue(p) && <p className="text-xs text-muted-foreground">{stockValue(p)}</p>}
                    </td>
                    <td className="py-3.5 pl-6 pr-3">
                      <PriceCell p={p} />
                    </td>
                    <td className="whitespace-nowrap py-3.5 pl-8 pr-3">
                      <p className="tabular-nums">{formatExpiry(p)}</p>
                      <p className={cn("text-xs", STATUS[p.status].text)}>{daysLabel(p.daysLeft)}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3.5 pl-3 pr-5">
                      <RowActions product={p} onEdit={() => setEditing(p)} onDelete={() => askDelete(p)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <PackageSearch className="mb-3 size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">{query ? "No products match your search" : "No products here yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {query ? (
              "Try a different product name, brand, batch or barcode."
            ) : (
              <>
                Add products from the{" "}
                <Link href={`/stores/${storeId}`} className="font-medium text-primary hover:underline">
                  store page
                </Link>{" "}
                by scanning a barcode or entering them manually.
              </>
            )}
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="border-t border-border p-4">
          <Pagination
            page={current}
            totalPages={totalPages}
            total={filtered.length}
            pageSize={pageSize}
            pageSizes={PAGE_SIZES}
            itemLabel="products"
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      )}
    </Card>

    {editing && (
      <EditStockDialog
        product={editing}
        onClose={() => setEditing(null)}
        onSaved={(name) => {
          setEditing(null);
          toast.success(`${name} was updated`);
        }}
      />
    )}

    {confirm && (
      <ConfirmDialog
        title={confirm.kind === "expired" ? `Delete all ${confirm.count} expired product${confirm.count === 1 ? "" : "s"}?` : confirm.title}
        description={
          confirm.kind === "expired"
            ? "Every product past its expiry date will be removed from this store's stock and logged as expired. This can't be undone."
            : (
                <div className="space-y-3">
                  <p>This removes the stock from this store. The reason is saved in the activity history.</p>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-foreground">Why is it being removed?</span>
                    <select
                      value={confirm.reason}
                      onChange={(e) => setConfirm({ ...confirm, reason: e.target.value as RemovalReason })}
                      aria-label="Reason for removing"
                      className="h-10 w-full cursor-pointer rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/20"
                    >
                      {REMOVAL_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )
        }
        confirmLabel={confirm.kind === "expired" ? "Delete expired" : "Remove"}
        pendingLabel="Deleting…"
        pending={pending}
        error={confirmError}
        onConfirm={runDelete}
        onCancel={() => {
          setConfirm(null);
          setConfirmError(null);
        }}
      />
    )}
    </>
  );
}
