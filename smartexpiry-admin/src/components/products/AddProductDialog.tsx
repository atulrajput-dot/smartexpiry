"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Boxes, LoaderCircle, PackagePlus, ScanBarcode, Sparkles, X } from "lucide-react";
import { addProductToStoreAction, lookupBarcodeAction } from "@/app/(dashboard)/stores/product-actions";
import { BarcodeScanner } from "@/components/products/BarcodeScanner";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { isPerishableCategory, PRODUCT_CATEGORIES, PRODUCT_UNITS } from "@/lib/products/catalog";
import { cn } from "@/lib/utils";
import type { AddStockResult, LookupResult, ProductPrefill } from "@/lib/validations/product";

type Added = Extract<AddStockResult, { ok: true }>;
type Lookup = Extract<LookupResult, { ok: true }>;

type Props = {
  storeId: string;
  storeName: string;
  mode: "scan" | "manual";
  onClose: () => void;
  onAdded: (result: Added) => void;
};

const FOUND_TEXT: Record<Lookup["found"], { variant: "success" | "info" | "warning"; title: string }> = {
  catalog: { variant: "success", title: "Found in your products" },
  open_food_facts: { variant: "info", title: "Found on Open Food Facts" },
  open_beauty_facts: { variant: "info", title: "Found on Open Beauty Facts" },
  not_found: { variant: "warning", title: "New barcode" },
};

const textareaClass =
  "w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-xs placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/20";

/** Local "YYYY-MM-DD" n days/months from today. */
function fromToday({ days = 0, months = 0 }: { days?: number; months?: number }) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const QUICK_EXPIRY = [
  { label: "+3 days", days: 3 },
  { label: "+1 week", days: 7 },
  { label: "+1 month", months: 1 },
  { label: "+3 months", months: 3 },
  { label: "+6 months", months: 6 },
  { label: "+1 year", months: 12 },
];

/** Scan or type a product, then record a stock batch of it in this store. */
export function AddProductDialog({ storeId, storeName, mode, onClose, onAdded }: Props) {
  const [step, setStep] = useState<"scan" | "lookup" | "form">(mode === "scan" ? "scan" : "form");
  const [scanError, setScanError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AddStockResult | null>(null);

  // Controlled bits of the form (the rest are uncontrolled inputs).
  const [category, setCategory] = useState("");
  const [productType, setProductType] = useState<"PERISHABLE" | "NON_PERISHABLE">("PERISHABLE");
  const [noExpiry, setNoExpiry] = useState(false);
  const [expiry, setExpiry] = useState("");

  const prefill: Partial<ProductPrefill> = lookup?.prefill ?? {};
  const errors = result && !result.ok ? result.errors : undefined;

  function applyPrefill(p: ProductPrefill) {
    setCategory(p.category ?? "");
    setProductType(p.productType ?? (p.category && !isPerishableCategory(p.category) ? "NON_PERISHABLE" : "PERISHABLE"));
    setNoExpiry(p.tracksExpiry === false);
    setExpiry(p.expiryDate ?? "");
    setFormKey((k) => k + 1); // remount inputs with the new defaults
  }

  async function handleDetected(raw: string) {
    setStep("lookup");
    setScanError(null);
    try {
      const res = await lookupBarcodeAction(raw);
      if (!res.ok) {
        setScanError(res.message);
        setStep("scan");
        return;
      }
      setLookup(res);
      applyPrefill(res.prefill);
      setResult(null);
      setStep("form");
    } catch {
      setScanError("Couldn't look up that barcode. Check your connection and try again.");
      setStep("scan");
    }
  }

  function close() {
    if (!pending) onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    try {
      const formData = new FormData(event.currentTarget);
      if (noExpiry) formData.set("noExpiry", "1");
      const res = await addProductToStoreAction(formData);
      setResult(res);
      if (res.ok) onAdded(res);
    } catch {
      setResult({ ok: false, message: "We couldn't add the product. Please try again." });
    } finally {
      setPending(false);
    }
  }

  const found = lookup ? FOUND_TEXT[lookup.found] : null;
  const missingExpiry = !!lookup && !lookup.prefill.expiryDate;

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
        aria-labelledby="add-product-title"
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
        className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl"
      >
        <div className="sticky top-0 z-30 flex items-start justify-between gap-4 border-b border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-7 sm:py-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              {step === "form" && mode === "manual" && !lookup ? <PackagePlus className="size-5" aria-hidden /> : <ScanBarcode className="size-5" aria-hidden />}
            </span>
            <div>
              <h2 id="add-product-title" className="text-xl font-semibold tracking-tight">
                {step === "form" ? "Add product" : "Scan a barcode"}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                To <span className="font-medium text-foreground">{storeName}</span>
              </p>
            </div>
          </div>
          <button type="button" aria-label="Close add product dialog" onClick={close} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {step === "scan" && (
          <div className="space-y-4 px-5 py-5 sm:px-7 sm:py-6">
            <BarcodeScanner onDetected={handleDetected} error={scanError} />
            <p className="text-center text-sm text-muted-foreground">
              No barcode?{" "}
              <button type="button" onClick={() => setStep("form")} className="font-medium text-primary hover:underline">
                Enter the details manually
              </button>
            </p>
          </div>
        )}

        {step === "lookup" && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center" role="status">
            <LoaderCircle className="size-8 animate-spin text-primary" aria-hidden />
            <p className="font-medium">Looking up the product…</p>
            <p className="text-sm text-muted-foreground">Checking your products, then public product databases.</p>
          </div>
        )}

        {step === "form" && (
          <form key={formKey} onSubmit={submit} noValidate className="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
            <input type="hidden" name="storeId" value={storeId} />
            <input type="hidden" name="source" value={lookup && lookup.found !== "not_found" ? "BARCODE_LOOKUP" : "MANUAL"} />
            <input type="hidden" name="imageUrl" value={prefill.imageUrl ?? ""} />

            {result && !result.ok && result.message && <Alert variant="error">{result.message}</Alert>}

            {lookup && found && (
              <div className="flex gap-4">
                {prefill.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- remote product photo from the lookup
                  <img src={prefill.imageUrl} alt="" className="size-20 shrink-0 rounded-xl border border-border bg-white object-contain p-1" />
                )}
                <Alert variant={found.variant} title={found.title} className="flex-1">
                  {lookup.found === "not_found" ? (
                    <>Barcode {lookup.prefill.barcode} isn&apos;t in any product database yet. Enter the details once — next time it fills in automatically.</>
                  ) : (
                    <>Filled in: {lookup.filled.join(", ")}. Please check them before saving.</>
                  )}
                  {lookup.fromGs1 && lookup.prefill.expiryDate && (
                    <span className="mt-1 flex items-center gap-1 font-medium text-foreground">
                      <Sparkles className="size-3.5" aria-hidden /> Expiry{lookup.prefill.batchNumber ? " and batch" : ""} read from the barcode.
                    </span>
                  )}
                </Alert>
              </div>
            )}

            {/* Product */}
            <section className="space-y-4">
              <SectionTitle icon={<PackagePlus className="size-4" aria-hidden />}>Product</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="name" label="Product name" placeholder="Amul Taaza Milk 1L" required defaultValue={prefill.name ?? ""} error={errors?.name} autoFocus={!prefill.name} />
                <Input name="brand" label="Brand" placeholder="Amul" defaultValue={prefill.brand ?? ""} error={errors?.brand} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Select
                  name="category"
                  label="Category *"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setProductType(isPerishableCategory(e.target.value) ? "PERISHABLE" : "NON_PERISHABLE");
                  }}
                  options={[{ value: "", label: "Choose category" }, ...PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))]}
                  className="h-11"
                />
                <Select
                  name="productType"
                  label="Type"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as typeof productType)}
                  options={[
                    { value: "PERISHABLE", label: "Perishable" },
                    { value: "NON_PERISHABLE", label: "Non-perishable" },
                  ]}
                  className="h-11"
                />
                <Select
                  name="unit"
                  label="Unit *"
                  defaultValue={prefill.unit ?? "pcs"}
                  options={PRODUCT_UNITS.map((u) => ({ value: u, label: u }))}
                  className="h-11"
                />
              </div>
              {(errors?.category || errors?.unit) && (
                <p role="alert" className="-mt-2 text-xs text-danger">{errors?.category?.[0] ?? errors?.unit?.[0]}</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="barcode" label="Barcode" placeholder="Optional" inputMode="numeric" defaultValue={prefill.barcode ?? ""} error={errors?.barcode} readOnly={!!lookup} hint={lookup ? "From the scan" : "Scan or type it to match this product next time"} />
                <Input name="packageSize" label="Package size" placeholder="1 L, 500 g, 10 tablets" defaultValue={prefill.packageSize ?? ""} error={errors?.packageSize} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="costPrice" label="Cost price (₹ per unit)" placeholder="Optional, e.g. 45.50" inputMode="decimal" defaultValue={prefill.costPrice ?? ""} error={errors?.costPrice} hint="What you pay. Used for value at risk." />
                <Input name="sellingPrice" label="Selling price (₹ per unit)" placeholder="Optional, e.g. 60" inputMode="decimal" defaultValue={prefill.sellingPrice ?? ""} error={errors?.sellingPrice} />
              </div>

              <details className="group rounded-xl border border-border px-4 py-3 open:pb-4">
                <summary className="cursor-pointer select-none text-sm font-medium text-muted-foreground group-open:mb-4 group-open:text-foreground">
                  More details (optional)
                </summary>
                <div className="space-y-4">
                  <Field label="Description" error={errors?.description?.[0]}>
                    <textarea name="description" rows={2} defaultValue={prefill.description ?? ""} className={textareaClass} />
                  </Field>
                  <Input name="storageInfo" label="Storage instructions" placeholder="Keep refrigerated below 4°C" defaultValue={prefill.storageInfo ?? ""} error={errors?.storageInfo} />
                  <Field label="Ingredients" error={errors?.ingredients?.[0]}>
                    <textarea name="ingredients" rows={3} defaultValue={prefill.ingredients ?? ""} className={textareaClass} />
                  </Field>
                </div>
              </details>
            </section>

            {/* Stock batch */}
            <section className="space-y-4 border-t border-border pt-5">
              <SectionTitle icon={<Boxes className="size-4" aria-hidden />}>Stock in this store</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="quantity" label="Quantity" placeholder="24" inputMode="decimal" required error={errors?.quantity} autoFocus={!!prefill.name} />
                <Input name="batchNumber" label="Batch / lot number" placeholder="Optional" defaultValue={prefill.batchNumber ?? ""} error={errors?.batchNumber} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="manufacturingDate" type="date" label="Manufacturing date" defaultValue={prefill.manufacturingDate ?? ""} error={errors?.manufacturingDate} max={fromToday({})} />
                <Input
                  name="expiryDate"
                  type="date"
                  label="Expiry date"
                  required={!noExpiry}
                  disabled={noExpiry}
                  value={noExpiry ? "" : expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  error={errors?.expiryDate}
                  hint={missingExpiry && !noExpiry ? "Check the pack — standard barcodes don't include the expiry date." : undefined}
                />
              </div>
              {!noExpiry && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Quick pick:</span>
                  {QUICK_EXPIRY.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => setExpiry(fromToday(q))}
                      className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary hover:text-secondary-foreground"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" checked={noExpiry} onChange={(e) => setNoExpiry(e.target.checked)} className="size-4 accent-[var(--primary)]" />
                This product doesn&apos;t expire
              </label>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              {mode === "scan" || lookup ? (
                <Button
                  type="button"
                  variant="ghost"
                  leftIcon={<ScanBarcode className="size-4" />}
                  onClick={() => {
                    setLookup(null);
                    setResult(null);
                    setStep("scan");
                  }}
                >
                  Scan another
                </Button>
              ) : (
                <Button type="button" variant="ghost" leftIcon={<ScanBarcode className="size-4" />} onClick={() => setStep("scan")}>
                  Scan a barcode instead
                </Button>
              )}
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button type="button" variant="outline" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit" loading={pending} loadingText="Adding…" leftIcon={<PackagePlus className="size-4" />}>
                  Add to store
                </Button>
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary">{icon}</span>
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{children}</h3>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span role="alert" className={cn("text-xs text-danger")}>{error}</span>}
    </label>
  );
}
