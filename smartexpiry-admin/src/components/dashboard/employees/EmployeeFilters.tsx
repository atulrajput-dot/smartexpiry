"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

type Props = {
  q: string;
  storeId: string;
  status: string;
  stores: { id: string; name: string; code: string }[];
  setParams: (updates: Record<string, string | null>) => void;
  pending: boolean;
};

/** Search box + store/status filters. Every change goes to the URL → server query. */
export function EmployeeFilters({ q, storeId, status, stores, setParams, pending }: Props) {
  // Remounting the search box (new key) is how "Clear" empties it.
  const [searchKey, setSearchKey] = useState(0);
  const hasFilters = !!(q || storeId || status);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      {/* After "Clear" the box remounts empty; the URL's old q may not have updated yet. */}
      <SearchBox
        key={searchKey}
        initial={searchKey === 0 ? q : ""}
        onSearch={(value) => setParams({ q: value || null })}
        pending={pending}
      />

      <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
        <Select
          srLabel="Filter by store"
          value={storeId}
          onChange={(e) => setParams({ store: e.target.value || null })}
          options={[{ value: "", label: "All stores" }, ...stores.map((s) => ({ value: s.id, label: s.name }))]}
          containerClassName="sm:w-48"
        />
        <Select
          srLabel="Filter by status"
          value={status}
          onChange={(e) => setParams({ status: e.target.value || null })}
          options={[
            { value: "", label: "All statuses" },
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
          ]}
          containerClassName="sm:w-40"
        />
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchKey((k) => k + 1);
              setParams({ q: null, store: null, status: null });
            }}
            leftIcon={<X className="size-4" />}
            className="col-span-2 sm:col-span-1"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

/** Debounced search input: queries the server 350 ms after typing stops. */
function SearchBox({ initial, onSearch, pending }: { initial: string; onSearch: (v: string) => void; pending: boolean }) {
  const [text, setText] = useState(initial);
  const [sent, setSent] = useState(initial.trim());

  useEffect(() => {
    const value = text.trim();
    if (value === sent) return;
    const timer = setTimeout(() => {
      setSent(value);
      onSearch(value);
    }, 350);
    return () => clearTimeout(timer);
  }, [text, sent, onSearch]);

  return (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search by name, email, phone, ID or designation"
        aria-label="Search employees"
        className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-9 text-sm text-foreground shadow-xs placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/20"
      />
      {pending && (
        <LoaderCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="Loading" />
      )}
    </div>
  );
}
