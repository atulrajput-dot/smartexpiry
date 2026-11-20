import Image from "next/image";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

/** SmartExpiry logo mark (same artwork as the Admin app and src/app/icon.png). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src={logo}
      alt=""
      width={44}
      height={44}
      priority
      // White tile: a hairline ring keeps its edge visible on light backgrounds.
      className={cn("size-10 shrink-0 select-none rounded-[22%] shadow-sm ring-1 ring-black/8", className)}
    />
  );
}

/** Logo + wordmark with an "Employee" tag. `inverted` for the dark brand panel. */
export function Logo({ className, inverted = false, showTag = true }: { className?: string; inverted?: boolean; showTag?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span className={cn("text-lg", inverted ? "text-white" : "text-foreground")}>
        Smart<span className={inverted ? "text-indigo-200" : "text-primary"}>Expiry</span>
      </span>
      {showTag && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
            inverted ? "bg-white/15 text-white" : "bg-secondary text-secondary-foreground",
          )}
        >
          Employee
        </span>
      )}
    </span>
  );
}
