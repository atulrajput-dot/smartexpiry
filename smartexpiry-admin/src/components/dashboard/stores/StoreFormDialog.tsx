"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Save, X } from "lucide-react";
import { createStoreAction, updateStoreAction } from "@/app/(dashboard)/stores/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MultiCombobox } from "@/components/ui/MultiCombobox";
import type { CreateStoreResult } from "@/lib/validations/store";

export type EmployeeOption = {
  id: string;
  name: string;
  employeeCode: string;
  designation: string;
  status: "ACTIVE" | "INACTIVE";
};

/** The fields needed to pre-fill the form when editing. */
export type EditableStore = {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string;
  address: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  employees: { id: string }[];
};

type Props = {
  employees: EmployeeOption[];
  /** Pass a store to edit it; omit to create a new one. */
  store?: EditableStore;
  onClose: () => void;
  onSaved: (store: { name: string; code: string }) => void;
};

/** Create / Edit Store modal. Mount it only while open so each open starts fresh. */
export function StoreFormDialog({ employees, store, onClose, onSaved }: Props) {
  const isEdit = !!store;
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CreateStoreResult | null>(null);
  const errors = result && !result.ok ? result.errors : undefined;

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: e.name,
    description: `${e.employeeCode} · ${e.designation}${e.status === "INACTIVE" ? " · Inactive" : ""}`,
  }));

  function close() {
    if (!pending) onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    try {
      const formData = new FormData(event.currentTarget);
      const response = isEdit ? await updateStoreAction(formData) : await createStoreAction(formData);
      setResult(response);
      if (response.ok) onSaved(response.store);
    } catch {
      setResult({ ok: false, message: isEdit ? "We couldn't save the changes. Please try again." : "We couldn't create the store. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-form-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
        className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl"
      >
        <div className="sticky top-0 z-30 flex items-start justify-between gap-4 border-b border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-7 sm:py-5">
          <div>
            <h2 id="store-form-title" className="text-xl font-semibold tracking-tight">
              {isEdit ? "Edit Store" : "Create New Store"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEdit ? (
                <>
                  Update details for <span className="font-medium text-foreground">{store.name}</span>{" "}
                  <span className="font-mono text-xs">({store.code})</span>. The store code doesn&apos;t change.
                </>
              ) : (
                "Add a location to your SmartExpiry account."
              )}
            </p>
          </div>
          <button
            type="button"
            aria-label={isEdit ? "Close edit store dialog" : "Close create store dialog"}
            onClick={close}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={submit} noValidate className="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
          {isEdit && <input type="hidden" name="storeId" value={store.id} />}
          {result && !result.ok && result.message && <Alert variant="error">{result.message}</Alert>}

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Store information</h3>
            <Input name="name" label="Store name" placeholder="Fresh Mart" required error={errors?.name} autoComplete="organization" defaultValue={store?.name} autoFocus />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="email" type="email" label="Store email" placeholder="store@example.com" error={errors?.email} autoComplete="email" defaultValue={store?.email ?? ""} />
              <Input name="phone" type="tel" label="Store phone" placeholder="+91 98765 43210" required error={errors?.phone} autoComplete="tel" inputMode="tel" defaultValue={store?.phone} />
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Store address</h3>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="store-address" className="text-sm font-medium">
                Address<span className="ml-0.5 text-danger">*</span>
              </label>
              <textarea
                id="store-address"
                name="address"
                required
                rows={2}
                placeholder="Building, street, area"
                defaultValue={store?.address}
                aria-invalid={!!errors?.address}
                className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-xs placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/20 aria-[invalid=true]:border-danger"
              />
              {errors?.address?.map((error) => (
                <p key={error} role="alert" className="text-xs text-danger">
                  {error}
                </p>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="country" label="Country" placeholder="India" required error={errors?.country} autoComplete="country-name" defaultValue={store?.country} />
              <Input name="state" label="State" placeholder="Madhya Pradesh" required error={errors?.state} autoComplete="address-level1" defaultValue={store?.state} />
              <Input name="city" label="City" placeholder="Indore" required error={errors?.city} autoComplete="address-level2" defaultValue={store?.city} />
              <Input name="pincode" label="Pincode" placeholder="452001" required error={errors?.pincode} autoComplete="postal-code" defaultValue={store?.pincode} />
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Employees</h3>
            <MultiCombobox
              name="employeeIds"
              label="Assigned employees"
              placeholder="Search employees by name, ID or designation"
              options={employeeOptions}
              defaultValue={store?.employees.map((e) => e.id)}
              error={errors?.employeeIds}
              hint="Optional. Select everyone who works at this store — you can change it later."
              emptyText={
                <>
                  No employees yet.{" "}
                  <Link href="/employees" className="font-medium text-primary underline-offset-4 hover:underline">
                    Add employees
                  </Link>
                </>
              }
            />
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={pending}
              loadingText={isEdit ? "Saving…" : "Creating store…"}
              leftIcon={isEdit ? <Save className="size-4" /> : <Check className="size-4" />}
            >
              {isEdit ? "Save changes" : "Create store"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
