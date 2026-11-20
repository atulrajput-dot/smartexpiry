"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, MapPin, Pencil, Plus, Store as StoreIcon, Trash2, Users } from "lucide-react";
import { deleteStoreAction } from "@/app/(dashboard)/stores/actions";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StoreFormDialog, type EmployeeOption } from "@/components/dashboard/stores/StoreFormDialog";
import { cn } from "@/lib/utils";

export type StoreEmployee = {
  id: string;
  name: string;
  employeeCode: string;
  status: "ACTIVE" | "INACTIVE";
  avatarUrl: string | null;
  /** True when this is the employee's only store. */
  onlyThisStore: boolean;
};

export type StoreSummary = {
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
  employees: StoreEmployee[];
};

type FormState = { mode: "create" } | { mode: "edit"; store: StoreSummary } | null;

const MAX_AVATARS = 5;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function StoreManager({ stores, employees }: { stores: StoreSummary[]; employees: EmployeeOption[] }) {
  const [form, setForm] = useState<FormState>(null);
  const [deleting, setDeleting] = useState<StoreSummary | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => setForm({ mode: "create" });

  async function confirmDelete() {
    if (!deleting) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      const res = await deleteStoreAction(deleting.id);
      if (!res.ok) {
        setDeleteError(res.message);
        return;
      }
      toast.success(`${deleting.name} (${deleting.code}) was deleted`);
      setDeleting(null);
    } catch {
      setDeleteError("We couldn't delete the store. Please try again.");
    } finally {
      setDeletePending(false);
    }
  }

  const strandedOnDelete = deleting?.employees.filter((e) => e.onlyThisStore) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Stores</h1>
          <p className="text-sm text-muted-foreground">Create and manage the stores connected to your account.</p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
          Create store
        </Button>
      </div>

      {stores.length ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {stores.map((store) => (
            <Card
              key={store.id}
              // Whole card opens the store; Edit/Delete sit above the link layer (z-10).
              className="group relative flex flex-col gap-4 p-5 transition-[border-color,box-shadow,transform] duration-150 focus-within:ring-2 focus-within:ring-ring hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:p-6"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Building2 className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">
                    <Link
                      href={`/stores/${store.id}`}
                      className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none group-hover:text-primary"
                    >
                      {store.name}
                    </Link>
                  </h2>
                  <p className="mt-1 inline-flex rounded-md bg-muted px-2 py-1 font-mono text-xs font-medium text-muted-foreground">
                    {store.code}
                  </p>
                </div>
                <div className="relative z-10 -mr-2 -mt-1 flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => setForm({ mode: "edit", store })}
                    aria-label={`Edit ${store.name}`}
                    title="Edit"
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleting(store);
                    }}
                    aria-label={`Delete ${store.name}`}
                    title="Delete"
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-4 text-sm">
                <p className="flex gap-2 text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    {store.address}, {store.city}, {store.state} {store.pincode}, {store.country}
                  </span>
                </p>
                <p className="text-foreground">{store.phone}</p>
                {store.email && <p className="truncate text-muted-foreground">{store.email}</p>}
              </div>

              <div className="mt-auto flex items-center gap-3 border-t border-border pt-4">
                <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                {store.employees.length ? (
                  <>
                    <div className="flex -space-x-2" aria-hidden>
                      {store.employees.slice(0, MAX_AVATARS).map((e) =>
                        e.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- authenticated API image
                          <img key={e.id} src={e.avatarUrl} alt="" title={e.name} className="size-7 rounded-full object-cover ring-2 ring-card" />
                        ) : (
                          <span
                            key={e.id}
                            title={e.name}
                            className={cn(
                              "flex size-7 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground ring-2 ring-card",
                              e.status === "INACTIVE" && "opacity-60",
                            )}
                          >
                            {initials(e.name)}
                          </span>
                        ),
                      )}
                      {store.employees.length > MAX_AVATARS && (
                        <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card">
                          +{store.employees.length - MAX_AVATARS}
                        </span>
                      )}
                    </div>
                    <span
                      className="min-w-0 truncate text-sm text-muted-foreground"
                      title={store.employees.map((e) => e.name).join(", ")}
                    >
                      {store.employees.length} {store.employees.length === 1 ? "employee" : "employees"}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">No employees assigned</span>
                )}
                <span
                  aria-hidden
                  className="ml-auto inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary"
                >
                  View
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <StoreIcon className="size-6" aria-hidden />
          </span>
          <h2 className="font-semibold">No stores yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add your first store to start organizing your SmartExpiry workspace.
          </p>
          <Button className="mt-5" onClick={openCreate} leftIcon={<Plus className="size-4" />}>
            Create your first store
          </Button>
        </Card>
      )}

      {form && (
        <StoreFormDialog
          key={form.mode === "edit" ? form.store.id : "create"}
          employees={employees}
          store={form.mode === "edit" ? form.store : undefined}
          onClose={() => setForm(null)}
          onSaved={(store) => {
            // The server action already refreshed the page data.
            toast.success(form.mode === "edit" ? `${store.name} (${store.code}) was updated` : `${store.name} was created as ${store.code}`);
            setForm(null);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete store?"
          description={
            <div className="space-y-2">
              <p>
                <span className="font-medium text-foreground">{deleting.name}</span> ({deleting.code}) will be
                permanently removed. Its employees are not deleted, they&apos;re just unassigned from this store. This
                can&apos;t be undone.
              </p>
              {strandedOnDelete.length > 0 && (
                <p className="rounded-lg bg-warning-soft px-3 py-2 text-warning">
                  {strandedOnDelete.length === 1 ? "1 employee works" : `${strandedOnDelete.length} employees work`} only
                  here and will have no store: {strandedOnDelete.map((e) => e.name).join(", ")}.
                </p>
              )}
            </div>
          }
          confirmLabel="Delete store"
          pendingLabel="Deleting…"
          pending={deletePending}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
