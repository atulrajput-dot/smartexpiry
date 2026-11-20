"use client";

import { useState } from "react";
import { Plus, SearchX, Users } from "lucide-react";
import { deleteEmployeeAction } from "@/app/(dashboard)/employees/actions";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { EmployeeFormDialog, type StoreOption } from "@/components/dashboard/employees/EmployeeFormDialog";
import { EmployeeFilters } from "@/components/dashboard/employees/EmployeeFilters";
import { EmployeeTable } from "@/components/dashboard/employees/EmployeeTable";
import { useQueryParams } from "@/hooks/useQueryParams";
import { cn } from "@/lib/utils";
import type { EmployeeListQuery, EmployeeListResult, EmployeeRow } from "@/lib/employees/list";

type Props = {
  result: EmployeeListResult;
  query: EmployeeListQuery;
  stores: StoreOption[];
  pageSizes: readonly number[];
};

/** Which dialog is open: create, edit a specific employee, or none. */
type FormState = { mode: "create" } | { mode: "edit"; employee: EmployeeRow } | null;

/** Employees page: header, server-filtered table with pagination, create/edit dialog and delete confirmation. */
export function EmployeeManager({ result, query, stores, pageSizes }: Props) {
  const { setParams, pending } = useQueryParams();
  const [form, setForm] = useState<FormState>(null);
  const [deleting, setDeleting] = useState<EmployeeRow | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => setForm({ mode: "create" });

  async function confirmDelete() {
    if (!deleting) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      const res = await deleteEmployeeAction(deleting.id);
      if (!res.ok) {
        setDeleteError(res.message);
        return;
      }
      toast.success(`${deleting.name} (${deleting.employeeCode}) was deleted`);
      setDeleting(null);
    } catch {
      setDeleteError("We couldn't delete the employee. Please try again.");
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <p className="text-sm font-medium text-primary">Workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Employees</h1>
          <p className="text-sm text-muted-foreground">Manage the people who help run your stores.</p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>
          Create employee
        </Button>
      </div>

      {result.totalUnfiltered === 0 ? (
        <Card className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Users className="size-6" aria-hidden />
          </span>
          <h2 className="font-semibold">No employees yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add employees and assign them to your stores. They&apos;ll appear here.
          </p>
          <Button className="mt-5" onClick={openCreate} leftIcon={<Plus className="size-4" />}>
            Create your first employee
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border p-4">
            <EmployeeFilters
              q={query.q}
              storeId={query.storeId}
              status={query.status}
              stores={stores}
              setParams={setParams}
              pending={pending}
            />
          </div>

          {/* Dim the old results while the server prepares the new ones. */}
          <div className={cn("transition-opacity", pending && "pointer-events-none opacity-60")} aria-busy={pending}>
            {result.rows.length ? (
              <EmployeeTable
                rows={result.rows}
                onEdit={(employee) => setForm({ mode: "edit", employee })}
                onDelete={(employee) => {
                  setDeleteError(null);
                  setDeleting(employee);
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <SearchX className="mb-3 size-8 text-muted-foreground" aria-hidden />
                <p className="font-medium">No employees match your search</p>
                <p className="mt-1 text-sm text-muted-foreground">Try a different search or clear the filters.</p>
              </div>
            )}
          </div>

          <div className="border-t border-border p-4">
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              total={result.total}
              pageSize={result.pageSize}
              pageSizes={pageSizes}
              itemLabel="employees"
              disabled={pending}
              onPageChange={(page) => setParams({ page: page > 1 ? String(page) : null }, { resetPage: false })}
              onPageSizeChange={(size) => setParams({ pageSize: String(size) })}
            />
          </div>
        </Card>
      )}

      {form && (
        <EmployeeFormDialog
          key={form.mode === "edit" ? form.employee.id : "create"}
          stores={stores}
          employee={form.mode === "edit" ? form.employee : undefined}
          onClose={() => setForm(null)}
          onSaved={(employee) => {
            // The server action already refreshed the page data.
            if (form.mode === "edit") toast.success(`${employee.name} (${employee.employeeCode}) was updated`);
            else
              toast.success(`${employee.name} was added as ${employee.employeeCode}`, {
                description: "Share their email and password so they can sign in to the employee app. You can view the password any time in the table.",
              });
            setForm(null);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete employee?"
          description={
            <>
              <span className="font-medium text-foreground">{deleting.name}</span> ({deleting.employeeCode}) will be
              permanently removed, along with their store assignments. They won&apos;t be able to sign in. This can&apos;t
              be undone.
            </>
          }
          confirmLabel="Delete employee"
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
