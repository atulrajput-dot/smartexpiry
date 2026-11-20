import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertVariant = "success" | "error" | "warning" | "info";

const styles: Record<AlertVariant, { box: string; Icon: typeof Info }> = {
  success: { box: "bg-success-soft text-success border-success/25", Icon: CircleCheck },
  error: { box: "bg-danger-soft text-danger border-danger/25", Icon: CircleAlert },
  warning: { box: "bg-warning-soft text-warning border-warning/25", Icon: TriangleAlert },
  info: { box: "bg-info-soft text-info border-info/25", Icon: Info },
};

type AlertProps = {
  variant?: AlertVariant;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** Inline status message for forms and pages. */
export function Alert({ variant = "info", title, children, className }: AlertProps) {
  const { box, Icon } = styles[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", box, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-foreground/80">{children}</div>}
      </div>
    </div>
  );
}
