"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Secondary text shown under the label and included in search. */
  description?: string;
};

export type MultiComboboxProps = {
  /** Each selected value is submitted as a separate `name` field (read with formData.getAll). */
  name: string;
  options: ComboboxOption[];
  label?: ReactNode;
  placeholder?: string;
  error?: string | string[];
  hint?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  defaultValue?: string[];
  /** Shown when there are no options at all. */
  emptyText?: ReactNode;
  className?: string;
};

/**
 * Searchable multi-select: type to filter, pick several options, selected
 * ones show as removable chips. Keyboard: ↑/↓ move, Enter toggles,
 * Esc closes, Backspace (empty search) removes the last chip.
 */
export function MultiCombobox({
  name,
  options,
  label,
  placeholder = "Search…",
  error,
  hint,
  required,
  disabled,
  defaultValue = [],
  emptyText = "No options available.",
  className,
}: MultiComboboxProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const errorList = Array.isArray(error) ? error : error ? [error] : [];
  const hasError = errorList.length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.description ?? ""}`.toLowerCase().includes(q));
  }, [options, query]);

  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = (value: string) => {
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
    setQuery("");
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // Never submit the surrounding form from the search box.
      e.preventDefault();
      if (open && filtered[active]) toggle(filtered[active].value);
      else setOpen(true);
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    } else if (e.key === "Backspace" && !query && selected.length) {
      setSelected((prev) => prev.slice(0, -1));
    }
  };

  return (
    <div ref={rootRef} className={cn("relative flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={`${id}-input`} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}

      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}

      <div
        onClick={() => {
          if (disabled) return;
          inputRef.current?.focus();
          setOpen(true);
        }}
        className={cn(
          "flex min-h-11 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2.5 py-1.5 shadow-xs",
          "transition-[border-color,box-shadow] duration-150 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20",
          hasError && "border-danger focus-within:border-danger focus-within:ring-danger/20",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <Search className="ml-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />

        {selected.map((value) => {
          const option = byValue.get(value);
          if (!option) return null;
          return (
            <span
              key={value}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-secondary py-0.5 pl-2 pr-1 text-xs font-medium text-secondary-foreground"
            >
              <span className="truncate">{option.label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(value);
                }}
                disabled={disabled}
                aria-label={`Remove ${option.label}`}
                className="rounded p-0.5 hover:bg-secondary-hover"
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          );
        })}

        <input
          ref={inputRef}
          id={`${id}-input`}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[active] ? `${id}-opt-${active}` : undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError || hint ? `${id}-message` : undefined}
          value={query}
          disabled={disabled}
          placeholder={selected.length ? "" : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          className="h-7 min-w-24 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        />

        <ChevronDown
          className={cn("mr-0.5 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </div>

      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute top-full z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">{emptyText}</li>
          ) : filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">No matches for “{query}”.</li>
          ) : (
            filtered.map((option, index) => {
              const isSelected = selected.includes(option.value);
              return (
                <li
                  key={option.value}
                  id={`${id}-opt-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => e.preventDefault()} // keep focus in the search box
                  onClick={() => toggle(option.value)}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm",
                    index === active && "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border border-input",
                      isSelected && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {isSelected && <Check className="size-3" aria-hidden />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{option.label}</span>
                    {option.description && (
                      <span className="block truncate text-xs text-muted-foreground">{option.description}</span>
                    )}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}

      {hasError ? (
        <p id={`${id}-message`} role="alert" className="text-xs text-danger">
          {errorList[0]}
        </p>
      ) : hint ? (
        <p id={`${id}-message`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
