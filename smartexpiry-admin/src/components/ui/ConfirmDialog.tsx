"use client";

import { useId, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

type ConfirmDialogProps = {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  /** "danger" for destructive actions (red button). */
  variant?: "danger" | "primary";
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Small modal asking the user to confirm an action. Mount it only while open. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  pendingLabel,
  cancelLabel = "Cancel",
  variant = "danger",
  pending = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const id = useId();
  const cancel = () => {
    if (!pending) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-70 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
        }}
        className="w-full max-w-md rounded-t-3xl border border-border bg-card p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex gap-4">
          {variant === "danger" && (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
              <TriangleAlert className="size-5" aria-hidden />
            </span>
          )}
          <div className="min-w-0 space-y-1.5">
            <h2 id={`${id}-title`} className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <div id={`${id}-desc`} className="text-sm text-muted-foreground">
                {description}
              </div>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mt-4">
            {error}
          </Alert>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={cancel} disabled={pending} autoFocus>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={pending} loadingText={pendingLabel}>
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
