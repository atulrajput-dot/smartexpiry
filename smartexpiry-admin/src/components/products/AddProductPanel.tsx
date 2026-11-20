"use client";

import { useState } from "react";
import { ArrowRight, PencilLine, ScanBarcode, Zap } from "lucide-react";
import { AddProductDialog } from "@/components/products/AddProductDialog";
import { toast } from "@/components/ui/Toast";
import type { AddStockResult } from "@/lib/validations/product";

type Added = Extract<AddStockResult, { ok: true }>;

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "Add products" section on the store page: scan or manual entry. */
export function AddProductPanel({ storeId, storeName }: { storeId: string; storeName: string }) {
  const [mode, setMode] = useState<"scan" | "manual" | null>(null);

  const open = (m: "scan" | "manual") => {
    setMode(m);
  };

  return (
    <section aria-labelledby="add-products-title" className="space-y-4">
      <div>
        <h2 id="add-products-title" className="text-lg font-semibold">Add products</h2>
        <p className="text-sm text-muted-foreground">Stock this store by scanning a barcode or entering the details yourself.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Scan — the recommended path */}
        <button
          type="button"
          onClick={() => open("scan")}
          className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-brand-from to-brand-to p-6 text-left text-white shadow-sm transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
          className="group rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          storeId={storeId}
          storeName={storeName}
          mode={mode}
          onClose={() => setMode(null)}
          onAdded={(res) => {
            const added: Added = res;
            const usedMode = mode ?? "scan";
            setMode(null);
            toast.success(`Added ${added.quantity} ${added.unit} of ${added.productName}`, {
              description: `${
                added.expiryDate ? `Expires ${dateFormat.format(new Date(`${added.expiryDate}T00:00:00Z`))}.` : "No expiry date."
              }${added.isNewProduct ? " Saved to your products for next time." : ""}`,
              action: { label: "Add another", onClick: () => open(usedMode) },
            });
          }}
        />
      )}
    </section>
  );
}
