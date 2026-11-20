"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { BriefcaseBusiness, ImagePlus, KeyRound, Save, UserRoundPlus, Users, X } from "lucide-react";
import { createEmployeeAction, updateEmployeeAction } from "@/app/(dashboard)/employees/actions";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MultiCombobox } from "@/components/ui/MultiCombobox";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import type { EmployeeRow } from "@/lib/employees/list";
import {
  MAX_PROFILE_IMAGE_BYTES,
  PROFILE_IMAGE_TYPES,
  type CreateEmployeeResult,
} from "@/lib/validations/employee";

const fieldClass =
  "w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-xs placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/20";

export type StoreOption = { id: string; name: string; code: string; city: string };

type Props = {
  stores: StoreOption[];
  /** Pass an employee to edit them; omit to create a new one. */
  employee?: EmployeeRow;
  onClose: () => void;
  onSaved: (employee: { name: string; employeeCode: string }) => void;
};

/**
 * Create / Edit Employee modal. Mount it only while open so each open starts
 * fresh (empty for create, pre-filled for edit).
 */
export function EmployeeFormDialog({ stores, employee, onClose, onSaved }: Props) {
  const isEdit = !!employee;
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CreateEmployeeResult | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const errors = result && !result.ok ? result.errors : undefined;
  const storeOptions = stores.map((s) => ({ value: s.id, label: s.name, description: `${s.code} · ${s.city}` }));
  const currentImage = isEdit && !removeCurrentImage ? employee.avatarUrl : null;

  // Free the preview object URL when it changes or the dialog closes.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  function close() {
    if (!pending) onClose();
  }

  function generatePassword() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const symbols = "!@#$%";
    const bytes = new Uint32Array(14);
    window.crypto.getRandomValues(bytes);
    const base = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
    // Guarantee a digit and a symbol so it always passes the password rules.
    setPassword(`${base}${bytes[0]! % 10}${symbols[bytes[1]! % symbols.length]}`);
  }

  function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImageError(null);
    if (!file) {
      setPreview(null);
      return;
    }
    if (!(PROFILE_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setImageError("Upload a PNG, JPG or WEBP image.");
    } else if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setImageError("Profile image must be 2 MB or smaller.");
    }
    setPreview({ url: URL.createObjectURL(file), name: file.name });
  }

  /** Removes the newly chosen file, or (when none) marks the saved photo for removal. */
  function removeImage() {
    if (preview) {
      if (fileRef.current) fileRef.current.value = "";
      setPreview(null);
      setImageError(null);
    } else {
      setRemoveCurrentImage(true);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (imageError) return;
    setPending(true);
    setResult(null);
    try {
      const formData = new FormData(event.currentTarget);
      const response = isEdit ? await updateEmployeeAction(formData) : await createEmployeeAction(formData);
      setResult(response);
      if (response.ok) onSaved(response.employee);
    } catch {
      setResult({ ok: false, message: isEdit ? "We couldn't save the changes. Please try again." : "We couldn't create the employee. Please try again." });
    } finally {
      setPending(false);
    }
  }

  const shownImage = preview?.url ?? currentImage;

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
        aria-labelledby="employee-form-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
        className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl"
      >
        <div className="sticky top-0 z-30 flex items-start justify-between gap-4 border-b border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-7 sm:py-5">
          <div>
            <h2 id="employee-form-title" className="text-xl font-semibold tracking-tight">
              {isEdit ? "Edit Employee" : "Create Employee"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEdit ? (
                <>
                  Update details for <span className="font-medium text-foreground">{employee.name}</span> ({employee.employeeCode}).
                </>
              ) : (
                "Add personal details and assign a role and store."
              )}
            </p>
          </div>
          <button
            type="button"
            aria-label={isEdit ? "Close edit employee dialog" : "Close create employee dialog"}
            onClick={close}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={submit} noValidate className="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
          {isEdit && <input type="hidden" name="employeeId" value={employee.id} />}
          {removeCurrentImage && !preview && <input type="hidden" name="removeImage" value="1" />}

          {result && !result.ok && result.message && <Alert variant="error">{result.message}</Alert>}

          {stores.length === 0 && (
            <Alert variant="warning" title="Create a store first">
              Employees must be assigned to at least one store.{" "}
              <Link href="/stores" className="font-medium text-foreground underline underline-offset-4">
                Go to Stores
              </Link>
            </Alert>
          )}

          <section className="space-y-4">
            <SectionTitle icon={<Users className="size-4" aria-hidden />}>Personal information</SectionTitle>
            <Input name="name" label="Full name" placeholder="Rahul Sharma" autoComplete="off" required error={errors?.name} defaultValue={employee?.name} autoFocus />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="email" type="email" label="Email" placeholder="rahul@gmail.com" autoComplete="off" required error={errors?.email} defaultValue={employee?.email} />
              <Input name="phone" type="tel" label="Phone number" placeholder="9876543210" autoComplete="off" inputMode="tel" required error={errors?.phone} defaultValue={employee?.phone} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                Profile image <span className="font-normal text-muted-foreground">(optional)</span>
              </span>
              <div
                className={cn(
                  "flex min-h-20 items-center gap-3 rounded-xl border border-dashed border-input bg-background px-4 py-3",
                  (imageError || errors?.profileImage) && "border-danger",
                )}
              >
                {shownImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- blob preview or authenticated avatar URL
                  <img src={shownImage} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <ImagePlus className="size-5" aria-hidden />
                  </span>
                )}
                <label htmlFor="employee-image" className="min-w-0 flex-1 cursor-pointer">
                  <span className="block truncate text-sm font-medium">
                    {preview ? preview.name : currentImage ? "Current photo" : removeCurrentImage ? "Photo will be removed" : "Choose a profile photo"}
                  </span>
                  <span className="block text-xs text-muted-foreground">PNG, JPG or WEBP · up to 2 MB</span>
                </label>
                <label htmlFor="employee-image" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  {shownImage ? "Replace" : "Browse"}
                </label>
                {shownImage && (
                  <Button type="button" variant="ghost" size="sm" onClick={removeImage}>
                    Remove
                  </Button>
                )}
                <input
                  ref={fileRef}
                  id="employee-image"
                  name="profileImage"
                  type="file"
                  accept={PROFILE_IMAGE_TYPES.join(",")}
                  onChange={onImageChange}
                  className="sr-only"
                />
              </div>
              {(imageError || errors?.profileImage) && (
                <p role="alert" className="text-xs text-danger">
                  {imageError ?? errors?.profileImage?.[0]}
                </p>
              )}
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <SectionTitle icon={<KeyRound className="size-4" aria-hidden />}>Login information</SectionTitle>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="employee-password" className="text-sm font-medium">
                  {isEdit ? "New password" : "Password"}
                  {isEdit ? (
                    <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                  ) : (
                    <span className="ml-0.5 text-danger">*</span>
                  )}
                </label>
                <button type="button" onClick={generatePassword} className="text-xs font-medium text-primary hover:underline">
                  Generate password
                </button>
              </div>
              <Input
                id="employee-password"
                name="password"
                type="password"
                placeholder={isEdit ? "Leave blank to keep the current password" : "Create or generate a password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required={!isEdit}
                error={errors?.password}
              />
              {!errors?.password && (
                <p className="text-xs text-muted-foreground">
                  {isEdit
                    ? employee.hasViewablePassword
                      ? "Leave blank to keep the current password. A new one needs 8+ characters with a letter, a number and a special character."
                      : "The current password can't be shown. Set a new one to make it viewable in the table."
                    : "8+ characters with a letter, a number and a special character. You can view it later in the Employees table."}
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="employee-id" className="text-sm font-medium">Employee ID</label>
                <input
                  id="employee-id"
                  readOnly
                  value={isEdit ? employee.employeeCode : "Auto-generated"}
                  className={cn(fieldClass, "h-11 bg-muted/50 text-muted-foreground", isEdit && "font-mono")}
                />
                <p className="text-xs text-muted-foreground">{isEdit ? "IDs can't be changed." : "Example: EMP-001"}</p>
              </div>
              {isEdit ? (
                <div className="flex flex-col gap-1.5">
                  <Select
                    name="status"
                    label="Status"
                    defaultValue={employee.status}
                    options={[
                      { value: "ACTIVE", label: "Active" },
                      { value: "INACTIVE", label: "Inactive" },
                    ]}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">Inactive employees can&apos;t sign in.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="employee-status" className="text-sm font-medium">Status</label>
                  <input id="employee-status" readOnly value="Active" className={`${fieldClass} h-11 bg-muted/50 text-muted-foreground`} />
                  <p className="text-xs text-muted-foreground">New employees start as active.</p>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <SectionTitle icon={<BriefcaseBusiness className="size-4" aria-hidden />}>Work information</SectionTitle>
            <Input name="designation" label="Designation" placeholder="Store Manager" required error={errors?.designation} defaultValue={employee?.designation} />
            <MultiCombobox
              name="storeIds"
              label="Assigned store(s)"
              placeholder="Search stores by name, code or city"
              options={storeOptions}
              defaultValue={employee?.stores.map((s) => s.id)}
              required
              error={errors?.storeIds}
              hint="The employee will work in every store you select."
              emptyText="No stores yet. Create a store first."
            />
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={pending}
              loadingText={isEdit ? "Saving…" : "Creating employee…"}
              disabled={stores.length === 0}
              leftIcon={isEdit ? <Save className="size-4" /> : <UserRoundPlus className="size-4" />}
            >
              {isEdit ? "Save changes" : "Create employee"}
            </Button>
          </div>
        </form>
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
