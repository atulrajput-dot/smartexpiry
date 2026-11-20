import type { ReactNode } from "react";

/** Title + subtitle at the top of each auth page. */
export function AuthHeading({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-8 space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/** Loading placeholder for forms that read the URL. */
export function FormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="animate-pulse space-y-5" aria-hidden>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-11 rounded-lg bg-muted" />
        </div>
      ))}
      <div className="h-11 rounded-lg bg-muted" />
    </div>
  );
}
