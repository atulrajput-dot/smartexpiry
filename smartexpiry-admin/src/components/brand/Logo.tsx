import Image from "next/image";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

/**
 * SmartExpiry logo mark: scan a barcode, keep products fresh, beat the clock.
 * Same artwork as src/app/icon.png and public/brand/smartexpiry-logo.png.
 */
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

/** SmartExpiry logo + wordmark. `inverted` for use on the dark brand panel. */
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span className={cn("text-lg", inverted ? "text-white" : "text-foreground")}>
        Smart<span className={inverted ? "text-emerald-200" : "text-primary"}>Expiry</span>
      </span>
    </span>
  );
}
