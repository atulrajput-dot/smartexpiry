"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightweight toasts. Call `toast.success("Saved")` from any client component;
 * <Toaster /> (mounted once in the dashboard shell) shows them in a corner
 * and dismisses them automatically.
 */

type ToastVariant = "success" | "error" | "info";

type ToastOptions = {
  description?: ReactNode;
  /** Optional button, e.g. "Add another". Clicking it also closes the toast. */
  action?: { label: string; onClick: () => void };
  /** Milliseconds before it disappears (default 4s, 7s with a description). */
  duration?: number;
};

type ToastItem = ToastOptions & { id: number; title: ReactNode; variant: ToastVariant };

const MAX_VISIBLE = 4;
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function push(variant: ToastVariant, title: ReactNode, options: ToastOptions = {}) {
  const id = nextId++;
  items = [...items, { ...options, id, title, variant }].slice(-MAX_VISIBLE);
  emit();
  return id;
}

export function dismissToast(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (title: ReactNode, options?: ToastOptions) => push("success", title, options),
  error: (title: ReactNode, options?: ToastOptions) => push("error", title, options),
  info: (title: ReactNode, options?: ToastOptions) => push("info", title, options),
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => items;
const EMPTY: ToastItem[] = [];
const getServerSnapshot = () => EMPTY;

const STYLES: Record<ToastVariant, { Icon: typeof CircleCheck; icon: string }> = {
  success: { Icon: CircleCheck, icon: "text-success" },
  error: { Icon: CircleAlert, icon: "text-danger" },
  info: { Icon: Info, icon: "text-primary" },
};

function ToastCard({ item }: { item: ToastItem }) {
  const { Icon, icon } = STYLES[item.variant];
  const duration = item.duration ?? (item.description ? 7000 : 4000);
  const remaining = useRef(duration);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);

  const start = () => {
    startedAt.current = Date.now();
    timer.current = setTimeout(() => dismissToast(item.id), remaining.current);
  };
  const pause = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    remaining.current = Math.max(1000, remaining.current - (Date.now() - startedAt.current));
  };

  useEffect(() => {
    start();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per toast
  }, []);

  return (
    <div
      role={item.variant === "error" ? "alert" : "status"}
      onMouseEnter={pause}
      onMouseLeave={start}
      onFocus={pause}
      onBlur={start}
      className="pointer-events-auto flex w-full animate-pop-in items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-foreground shadow-xl ring-1 ring-black/5"
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", icon)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{item.title}</p>
        {item.description && <div className="mt-1 text-muted-foreground">{item.description}</div>}
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action!.onClick();
              dismissToast(item.id);
            }}
            className="mt-2 rounded-md text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {item.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(item.id)}
        aria-label="Dismiss notification"
        className="-m-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Mount once. Top-centre on phones (clear of the bottom nav), top-right on larger screens. */
export function Toaster() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-80 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:w-[24rem] sm:items-end sm:p-6"
    >
      {list.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
