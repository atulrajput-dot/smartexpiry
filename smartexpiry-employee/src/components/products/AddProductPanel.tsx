"use client";

import { useState } from "react";
import { ArrowRight, PencilLine, ScanBarcode, Zap } from "lucide-react";
import { AddProductDialog, type StoreOption } from "@/components/products/AddProductDialog";
import { toast } from "@/components/ui/Toast";
import type { AddStockResult } from "@/lib/validations/product";

type Added = Extract<AddStockResult, { ok: true }>;

const qty = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "Add products" section on Home: scan or manual entry into one or more of the employee's stores. */
export function AddProductPanel({ stores }: { stores: StoreOption[] }) {
  const [mode, setMode] = useState<"scan" | "manual" | null>(null);

  const disabled = stores.length === 0;
  const open = (m: "scan" | "manual") => {
    if (!disabled) setMode(m);
  };

  return (
    <section aria-labelledby="add-products-title" className="space-y-4">
      <div>
        <h2 id="add-products-title" className="text-lg font-semibold">Add products</h2>
        <p className="text-sm text-muted-foreground">
          {disabled
            ? "You need a store before you can add products. Ask your admin to assign you to one."
            : stores.length === 1
              ? `Stock ${stores[0]!.name} by scanning a barcode or entering the details yourself.`
              : "Scan a barcode or enter the details, then pick one or more of your stores."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Scan — the recommended path */}
        <button
          type="button"
          onClick={() => open("scan")}
          disabled={disabled}
          className="group relative disabled:pointer-events-none disabled:opacity-50 overflow-hidden rounded-2xl bg-linear-to-br from-brand-from to-brand-to p-6 text-left text-white shadow-sm transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex items-start justify-between gap-4">
            <span className="flex size-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <ScanBarcode className="size-6" aria-hidden />
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
              <Zap className="size-3" aria-hidden /> Fastest
            </span>
          </div>
          <h3 className="relative mt-5 text-lg font-semibold">Scan barcode</h3>
          <p className="relative mt-1 text-sm text-white/80">
            Point your camera at the barcode. Product details fill in automatically, and expiry &amp; batch too for GS1
            DataMatrix codes on medicines.
          </p>
          <span className="relative mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
            Start scanning <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </span>
        </button>

        {/* Manual */}
        <button
          type="button"
          onClick={() => open("manual")}
          disabled={disabled}
          className="group rounded-2xl disabled:pointer-events-none disabled:opacity-50 border border-border bg-card p-6 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
            <PencilLine className="size-6" aria-hidden />
          </span>
          <h3 className="mt-5 text-lg font-semibold">Add manually</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            For loose items, store-made goods or products without a barcode. Type the name, quantity and expiry date.
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            Enter details <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </span>
        </button>
      </div>


      {mode && (
        <AddProductDialog
          stores={stores}
          mode={mode}
          onClose={() => setMode(null)}
          onAdded={(res) => {
            const added: Added = res;
            const usedMode = mode ?? "scan";
            setMode(null);
            const where =
              added.stores.length === 1
                ? `${qty.format(added.stores[0]!.quantity)} ${added.unit} to ${added.stores[0]!.name}`
                : added.stores.map((s) => `${s.name} ${qty.format(s.quantity)} ${added.unit}`).join(" · ");
            toast.success(`Added ${added.productName}`, {
              description: `${where}. ${
                added.expiryDate ? `Expires ${dateFormat.format(new Date(`${added.expiryDate}T00:00:00Z`))}.` : "No expiry date."
              }${added.isNewProduct ? " Saved to your company's products." : ""}`,
              action: { label: "Add another", onClick: () => open(usedMode) },
            });
          }}
        />
      )}
    </section>
  );
}
