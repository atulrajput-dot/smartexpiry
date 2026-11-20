"use client";

import { LoaderCircle, X } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { useQueryParams } from "@/hooks/useQueryParams";

type Option = { value: string; label: string };

/** Store / person / action filters for the Activity page (URL-driven, filtered on the server). */
export function ActivityFilters({ stores, people, value }: { stores: Option[]; people: Option[]; value: { store: string; person: string; action: string } }) {
  const { setParams, pending } = useQueryParams();
  const active = !!(value.store || value.person || value.action);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <Select
        srLabel="Store"
        value={value.store}
        onChange={(e) => setParams({ store: e.target.value || null })}
        options={[{ value: "", label: "All stores" }, ...stores]}
        containerClassName="sm:w-56"
      />
      <Select
        srLabel="Person"
        value={value.person}
        onChange={(e) => setParams({ person: e.target.value || null })}
        options={[{ value: "", label: "Everyone" }, { value: "admin", label: "Admin (you)" }, ...people]}
        containerClassName="sm:w-56"
      />
      <Select
        srLabel="Action"
        value={value.action}
        onChange={(e) => setParams({ action: e.target.value || null })}
        options={[
          { value: "", label: "All actions" },
          { value: "STOCK_ADDED", label: "Added stock" },
          { value: "STOCK_UPDATED", label: "Edited" },
          { value: "STOCK_REMOVED", label: "Removed" },
          { value: "EXPIRED_CLEARED", label: "Cleared expired" },
        ]}
        containerClassName="sm:w-48"
      />
      {active && (
        <button
          type="button"
          onClick={() => setParams({ store: null, person: null, action: null })}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden /> Clear filters
        </button>
      )}
      {pending && <LoaderCircle className="size-4 animate-spin self-center text-muted-foreground" aria-label="Loading" />}
    </div>
  );
}

export function ActivityPagination({ page, totalPages, total, pageSize }: { page: number; totalPages: number; total: number; pageSize: number }) {
  const { setParams } = useQueryParams();
  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      total={total}
      pageSize={pageSize}
      itemLabel="events"
      onPageChange={(p) => setParams({ page: p > 1 ? String(p) : null }, { resetPage: false })}
    />
  );
}
