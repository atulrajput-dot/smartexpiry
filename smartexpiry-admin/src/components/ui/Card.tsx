import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Surface container. Override padding/shape via `className`. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
