import { ArrowUp, Languages, MessageSquareText, ShieldCheck, Sparkles, Zap } from "lucide-react";

const points = [
  { Icon: MessageSquareText, title: "Ask in plain words", text: "\"What expires this week in Fresh Mart?\" No filters or reports to set up." },
  { Icon: Languages, title: "English, Hindi or Hinglish", text: "\"Kal tak kitne product expire honge?\" works just as well." },
  { Icon: Zap, title: "Live answers from your data", text: "Expiry, stock value, stores, employees and who changed what." },
  { Icon: ShieldCheck, title: "Private and read-only", text: "It only sees your own business and never changes your stock." },
];

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">{children}</p>
    </div>
  );
}

function AiAnswer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 via-teal-500 to-indigo-500 text-white shadow-sm">
        <Sparkles className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-2.5 text-sm text-foreground/90">{children}</div>
    </div>
  );
}

/** Landing page section introducing the AI assistant, with a static sample chat. */
export function AiShowcase() {
  return (
    <section id="ai" className="relative scroll-mt-20 overflow-hidden py-20 sm:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-10 size-[36rem] -translate-x-1/2 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/10" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-emerald-500/15 to-indigo-500/15 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">
            <Sparkles className="size-3.5" aria-hidden />
            New · SmartExpiry AI
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Just ask. Find expiring stock and store details in seconds.
          </h2>
          <p className="mt-4 text-base text-muted-foreground text-pretty sm:text-lg">
            The built-in AI assistant answers questions about your stores using your live data, from any page with one click.
          </p>

          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            {points.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Sample chat (illustration, not live data) */}
        <div className="min-w-0" aria-hidden>
          <div className="relative rounded-3xl border border-border bg-card shadow-2xl shadow-indigo-900/10 ring-1 ring-black/5 dark:shadow-black/40">
            <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5">
              <span className="flex size-7 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 via-teal-500 to-indigo-500 text-white">
                <Sparkles className="size-3.5" />
              </span>
              <p className="text-sm font-semibold">SmartExpiry AI</p>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-success" /> Live data
              </span>
            </div>

            <div className="space-y-5 p-5">
              <Bubble>What expires this week in Fresh Mart?</Bubble>
              <AiAnswer>
                <p>
                  <strong className="font-semibold text-foreground">3 products</strong> expire this week in Fresh Mart, worth{" "}
                  <strong className="font-semibold text-foreground">₹1,240</strong> at cost:
                </p>
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
                  {[
                    { name: "Amul Taaza Milk 1 L", meta: "12 pcs", badge: "Tomorrow", cls: "bg-warning-soft text-warning" },
                    { name: "Fresh Paneer 200 g", meta: "5 pcs", badge: "In 3 days", cls: "bg-warning-soft text-warning" },
                    { name: "Brown Bread 400 g", meta: "8 pcs", badge: "In 5 days", cls: "bg-warning-soft text-warning" },
                  ].map((r) => (
                    <li key={r.name} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.meta}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${r.cls}`}>{r.badge}</span>
                    </li>
                  ))}
                </ul>
              </AiAnswer>
              <Bubble>Aur us store me kaun kaam karta hai?</Bubble>
              <AiAnswer>
                <p>
                  Fresh Mart has <strong className="font-semibold text-foreground">3 employees</strong>: Ravi Kumar (Store Manager), Sunita Verma and
                  Aman Singh.
                </p>
              </AiAnswer>
            </div>

            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2 rounded-full border border-border bg-background py-1.5 pl-4 pr-1.5">
                <span className="flex-1 truncate text-sm text-muted-foreground">Ask about stock, expiry or stores…</span>
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <ArrowUp className="size-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
