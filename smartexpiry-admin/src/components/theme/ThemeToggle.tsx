"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

const subscribe = () => () => {};

type ThemeToggleProps = {
  /**
   * compact: small icon pill (default, e.g. auth pages)
   * full:    full-width segmented control with labels (sidebar, menus)
   * vertical: stacked icons (collapsed sidebar)
   */
  variant?: "compact" | "full" | "vertical";
  className?: string;
};

/** Light / Dark / System switch. */
export function ThemeToggle({ variant = "compact", className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  // The saved theme is only known in the browser; avoid a hydration mismatch.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn(
        "inline-flex gap-0.5 border border-border bg-card p-0.5",
        variant === "compact" && "items-center rounded-full",
        variant === "full" && "flex w-full items-center rounded-xl bg-muted/60",
        variant === "vertical" && "flex-col items-center rounded-full",
        className,
      )}
    >
      {options.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setTheme(value)}
            className={cn(
              "flex cursor-pointer items-center justify-center text-muted-foreground transition-colors",
              "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              variant === "full" ? "h-8 flex-1 gap-1.5 rounded-lg text-xs font-medium" : "size-7 rounded-full",
              active && (variant === "full" ? "bg-card text-foreground shadow-sm" : "bg-secondary text-secondary-foreground"),
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {variant === "full" && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
