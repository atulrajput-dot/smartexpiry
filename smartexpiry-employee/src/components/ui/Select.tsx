import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  options: SelectOption[];
  label?: ReactNode;
  /** Visually hidden label (still read by screen readers). */
  srLabel?: string;
  containerClassName?: string;
};

/** Native <select> styled to match Input. Override styles with `className`. */
export function Select({ options, label, srLabel, id, className, containerClassName, ...props }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      {(label || srLabel) && (
        <label htmlFor={selectId} className={cn("text-sm font-medium text-foreground", !label && "sr-only")}>
          {label ?? srLabel}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            "h-10 w-full cursor-pointer appearance-none rounded-lg border border-input bg-card pl-3 pr-9 text-sm text-foreground shadow-xs",
            "focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60",
            className,
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </div>
    </div>
  );
}
