"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { deleteStoreAction } from "@/app/(dashboard)/stores/actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { StoreFormDialog, type EditableStore, type EmployeeOption } from "@/components/dashboard/stores/StoreFormDialog";

type Props = {
  store: EditableStore;
  employees: EmployeeOption[];
  /** Names of employees whose only store is this one (shown in the delete warning). */
  onlyHereEmployees: string[];
};

/** Edit / Delete buttons on the store detail page. */
export function StoreDetailActions({ store, employees, onlyHereEmployees }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setPending(true);
    setError(null);
    try {
      const res = await deleteStoreAction(store.id);
      if (!res.ok) {
        setError(res.message);
        setPending(false);
        return;
      }
      toast.success(`${store.name} (${store.code}) was deleted`);
      router.push("/stores");
    } catch {
      setError("We couldn't delete the store. Please try again.");
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setEditing(true)} leftIcon={<Pencil className="size-4" />}>
          Edit
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setError(null);
            setDeleting(true);
          }}
          leftIcon={<Trash2 className="size-4" />}
          className="hover:border-danger/40 hover:bg-danger-soft hover:text-danger"
        >
          Delete
        </Button>
      </div>

      {editing && (
        <StoreFormDialog
          employees={employees}
          store={store}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false);
            toast.success(`${saved.name} was updated`);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete store?"
          description={
            <div className="space-y-2">
              <p>
                <span className="font-medium text-foreground">{store.name}</span> ({store.code}) will be permanently
                removed. Its employees are not deleted, they&apos;re just unassigned from this store. This can&apos;t be
                undone.
              </p>
              {onlyHereEmployees.length > 0 && (
                <p className="rounded-lg bg-warning-soft px-3 py-2 text-warning">
                  {onlyHereEmployees.length === 1 ? "1 employee works" : `${onlyHereEmployees.length} employees work`} only
                  here and will have no store: {onlyHereEmployees.join(", ")}.
                </p>
              )}
            </div>
          }
          confirmLabel="Delete store"
          pendingLabel="Deleting…"
          pending={pending}
          error={error}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(false)}
        />
      )}
    </>
  );
}
