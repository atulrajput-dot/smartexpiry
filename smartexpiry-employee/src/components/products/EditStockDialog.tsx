"use client";

import { useState, type FormEvent } from "react";
import { Boxes, Package, Save, X } from "lucide-react";
import { updateStockAction } from "@/app/(app)/products/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { InventoryRow } from "@/lib/inventory/store-inventory";
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from "@/lib/products/catalog";
import type { UpdateStockResult } from "@/lib/validations/product";

type Props = {
  product: InventoryRow;
  onClose: () => void;
  onSaved: (productName: string) => void;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {icon}
      {children}
    </h3>
  );
}

/** Edit a stock row: product details + this batch's quantity and dates. Mount only while open. */
export function EditStockDialog({ product, onClose, onSaved }: Props) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<UpdateStockResult | null>(null);
  const [noExpiry, setNoExpiry] = useState(!product.expiresOn && !product.tracksExpiry);
  const errors = result && !result.ok ? result.errors : undefined;

  const close = () => {
    if (!pending) onClose();
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    try {
      const formData = new FormData(event.currentTarget);
      if (noExpiry) formData.set("noExpiry", "1");
      const response = await updateStockAction(formData);
      setResult(response);
      if (response.ok) onSaved(response.productName);
    } catch {
      setResult({ ok: false, message: "We couldn't save the changes. Please try again." });
    } finally {
      setPending(false);
    }
  }

  const categories: string[] = [...PRODUCT_CATEGORIES];
  if (!categories.includes(product.category)) categories.push(product.category);

  return (
    <div
      className="fixed inset-0 z-60 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-stock-title"
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
        className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl"
      >
        <div className="sticky top-0 z-30 flex items-start justify-between gap-4 border-b border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-7 sm:py-5">
          <div className="min-w-0">
            <h2 id="edit-stock-title" className="text-xl font-semibold tracking-tight">
              Edit product
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {product.name}
              {product.barcode && <span className="ml-1.5 font-mono text-xs">({product.barcode})</span>}
            </p>
          </div>
          <button type="button" aria-label="Close edit product dialog" onClick={close} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={submit} noValidate className="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
          <input type="hidden" name="batchId" value={product.id} />
          {result && !result.ok && result.message && <Alert variant="error">{result.message}</Alert>}

          <section className="space-y-4">
            <SectionTitle icon={<Package className="size-4" aria-hidden />}>Product</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="name" label="Product name" required defaultValue={product.name} error={errors?.name} autoFocus />
              <Input name="brand" label="Brand" placeholder="Optional" defaultValue={product.brand ?? ""} error={errors?.brand} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select name="category" label="Category *" defaultValue={product.category} options={categories.map((c) => ({ value: c, label: c }))} className="h-11" />
              <Select name="unit" label="Unit *" defaultValue={product.unit} options={PRODUCT_UNITS.map((u) => ({ value: u, label: u }))} className="h-11" />
            </div>
            {(errors?.category || errors?.unit) && (
              <p role="alert" className="-mt-2 text-xs text-danger">
                {errors?.category?.[0] ?? errors?.unit?.[0]}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="costPrice" label="Cost price (₹ per unit)" placeholder="Optional, e.g. 45.50" inputMode="decimal" defaultValue={product.costPrice?.toString() ?? ""} error={errors?.costPrice} hint="What you pay. Used for value at risk." />
              <Input name="sellingPrice" label="Selling price (₹ per unit)" placeholder="Optional, e.g. 60" inputMode="decimal" defaultValue={product.sellingPrice?.toString() ?? ""} error={errors?.sellingPrice} />
            </div>
            <p className="text-xs text-muted-foreground">Product details are shared, so changes also show in other stores that stock this product.</p>
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <SectionTitle icon={<Boxes className="size-4" aria-hidden />}>Stock in this store</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="quantity" label={`Quantity (${product.unit})`} inputMode="decimal" required defaultValue={String(product.quantity)} error={errors?.quantity} />
              <Input name="batchNumber" label="Batch / lot number" placeholder="Optional" defaultValue={product.batch ?? ""} error={errors?.batchNumber} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="manufacturingDate" type="date" label="Manufacturing date" defaultValue={product.manufacturedOn ?? ""} error={errors?.manufacturingDate} max={today()} />
              <Input
                name="expiryDate"
                type="date"
                label="Expiry date"
                required={!noExpiry}
                disabled={noExpiry}
                defaultValue={product.expiresOn ?? ""}
                error={noExpiry ? undefined : errors?.expiryDate}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" checked={noExpiry} onChange={(e) => setNoExpiry(e.target.checked)} className="size-4 accent-[var(--primary)]" />
              This product doesn&apos;t expire
            </label>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" loading={pending} loadingText="Saving…">
              <Save className="size-4" aria-hidden />
              Save changes
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
