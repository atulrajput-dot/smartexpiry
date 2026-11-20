import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const number = new Intl.NumberFormat("en-IN");

/** Number card: icon, label and a big count. Pass `href` to make the whole card a link. */
export function StatTile({
  label,
  value,
  Icon,
  tone,
  href,
  className,
}: {
  label: string;
  value: number;
  Icon: LucideIcon;
  /** Classes for the icon chip, e.g. "bg-warning-soft text-warning". */
  tone: string;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className={cn("flex size-10 items-center justify-center rounded-xl", tone)}>
          <Icon className="size-5" aria-hidden />
        </span>
        {href && (
          <ArrowRight
            className="size-4 text-muted-foreground transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-primary"
            aria-hidden
          />
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-3xl font-semibold tabular-nums">{number.format(value)}</p>
    </>
  );
  const base = cn("min-w-0 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5", className);
  return href ? (
    <Link
      href={href}
      className={cn(
        base,
        "group transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}
