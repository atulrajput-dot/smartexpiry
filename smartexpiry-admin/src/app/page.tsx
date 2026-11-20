import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarClock,
  Check,
  History,
  IndianRupee,
  LogIn,
  ScanBarcode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  UserCog,
  Users,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { AiShowcase } from "@/components/landing/AiShowcase";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { buttonVariants } from "@/components/ui/Button";
import { ROUTES } from "@/lib/auth/constants";
import { EMPLOYEE_LOGIN_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "SmartExpiry: track expiry dates, waste less" },
  description:
    "SmartExpiry helps shops and supermarkets track stock and expiry dates across stores. Scan barcodes, get alerts before products expire, see the value at risk, and ask the built-in AI assistant about your stock.",
  openGraph: {
    title: "SmartExpiry: track expiry dates, waste less",
    description: "Scan products, get alerts before they expire, and manage every store and employee in one place.",
    images: ["/brand/smartexpiry-logo.png"],
  },
};

/** Indigo button for the employee side (matches the Employee app's colours). */
const employeeButton =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors " +
  "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-indigo-950 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const features = [
  { Icon: ScanBarcode, title: "Scan to add", text: "Point the phone camera at a barcode. Name, brand and category fill in by themselves." },
  { Icon: BellRing, title: "Alerts 2 days early", text: "See what expires today, tomorrow and this week, before it reaches a customer." },
  { Icon: Building2, title: "Many stores, one view", text: "Run every branch from one account, with totals per store and for the whole business." },
  { Icon: Users, title: "Your team, your rules", text: "Create employee logins and choose exactly which stores each person can work on." },
  { Icon: History, title: "Full history", text: "Every add, edit and removal is recorded with who did it, when and why." },
  { Icon: IndianRupee, title: "Know the money", text: "Add cost and selling price to see the value at risk and margin on every batch." },
];

const steps = [
  { Icon: UserCog, title: "Set up your stores", text: "The owner creates an admin account, adds stores and gives staff their logins." },
  { Icon: Smartphone, title: "Staff scan the stock", text: "Employees scan or type products with quantity and expiry date, right on the shelf." },
  { Icon: CalendarClock, title: "Act before it expires", text: "Everyone sees alerts and acts in time: sell, discount or return to the supplier." },
];

const adminPoints = [
  "Create stores and employee logins",
  "See all stores, alerts and value at risk",
  "Ask the AI about expiry, stock and stores",
  "Review every change in the activity history",
];
const employeePoints = ["Scan or add products in seconds", "Work only on your assigned stores", "Get alerts for items expiring soon"];

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base text-muted-foreground text-pretty sm:text-lg">{text}</p>
    </div>
  );
}

/** Public home page: what SmartExpiry is, and a way in for admins and for employees. */
export default function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="SmartExpiry home">
            <Logo />
          </Link>

          <nav aria-label="Page sections" className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#ai" className="hover:text-foreground">AI assistant</a>
            <a href="#how-it-works" className="hover:text-foreground">How it works</a>
            <a href="#login" className="hover:text-foreground">Sign in</a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href={EMPLOYEE_LOGIN_URL} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:inline-flex")}>
              Employee login
            </a>
            <Link href={ROUTES.login} className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}>
              Admin login
            </Link>
            <a href="#login" className={cn(buttonVariants({ size: "sm" }), "sm:hidden")}>
              <LogIn className="size-4" aria-hidden />
              Sign in
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
            <div className="absolute -right-32 top-40 size-96 rounded-full bg-indigo-400/15 blur-3xl dark:bg-indigo-500/10" />
            <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[22px_22px] mask-[radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
          </div>

          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:pb-28 lg:pt-24">
            <div className="min-w-0 text-center lg:text-left">
              <a
                href="#ai"
                className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/80 py-1 pl-1 pr-3 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-emerald-600 to-indigo-600 px-2 py-0.5 font-semibold text-white">
                  <Sparkles className="size-3" aria-hidden />
                  New
                </span>
                Ask AI about your expiry dates and stores
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </a>

              <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Sell it <span className="bg-linear-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-300">before</span> it expires.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground text-pretty lg:mx-0">
                SmartExpiry tracks every product and expiry date across your stores, warns your team before items expire,
                shows how much money is at risk, and answers your questions with a built-in AI assistant.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link href={ROUTES.login} className={buttonVariants({ size: "lg" })}>
                  <ShieldCheck className="size-5" aria-hidden />
                  Login as Admin
                </Link>
                <a href={EMPLOYEE_LOGIN_URL} className={cn(employeeButton, "h-12 px-6 text-base")}>
                  <Users className="size-5" aria-hidden />
                  Login as Employee
                </a>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                New business?{" "}
                <Link href={ROUTES.register} className="font-medium text-primary hover:underline">
                  Create a free admin account
                </Link>
              </p>
            </div>

            <div className="min-w-0 px-2 sm:px-6 lg:px-0">
              <ProductPreview />
            </div>
          </div>
        </section>

        {/* ── Quick facts ── */}
        <section aria-label="Highlights" className="border-y border-border bg-card/60">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-y-6 px-4 py-8 sm:px-6 md:grid-cols-4">
            {[
              { k: "2 days", v: "early expiry alerts" },
              { k: "1 scan", v: "to add a product" },
              { k: "Any number", v: "of stores and staff" },
              { k: "100%", v: "of changes recorded" },
            ].map((s) => (
              <div key={s.v} className="text-center">
                <dt className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{s.k}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{s.v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Features ── */}
        <section id="features" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Features"
              title="Everything you need to stop expiry losses"
              text="Built for the shop floor: fast on a phone, clear on a laptop, and safe for a whole team."
            />
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ Icon, title, text }) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── AI assistant ── */}
        <AiShowcase />

        {/* ── How it works ── */}
        <section id="how-it-works" className="scroll-mt-20 border-y border-border bg-muted/50 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="How it works"
              title="Up and running in three steps"
              text="The owner sets things up once. After that, the team keeps the shelves fresh every day."
            />
            <ol className="mt-14 grid gap-6 md:grid-cols-3">
              {steps.map(({ Icon, title, text }, i) => (
                <li key={title} className="relative rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <span className="absolute right-5 top-4 text-5xl font-bold text-muted-foreground/15 tabular-nums" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-brand-from to-brand-to text-white shadow-sm">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 font-semibold">
                    <span className="sr-only">Step {i + 1}: </span>
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Choose how to sign in ── */}
        <section id="login" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Sign in"
              title="One product, two ways in"
              text="Owners and managers use the admin console. Store staff use the employee app with the login their admin gave them."
            />

            <div className="mt-14 grid gap-6 md:grid-cols-2">
              {/* Admin */}
              <div className="flex flex-col rounded-3xl border border-emerald-200 bg-linear-to-b from-emerald-50 to-card p-7 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/40">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                  <ShieldCheck className="size-6" aria-hidden />
                </span>
                <h3 className="mt-5 text-xl font-semibold">I&apos;m an Admin</h3>
                <p className="mt-1 text-sm text-muted-foreground">Business owner or manager</p>
                <ul className="mt-5 space-y-2.5 text-sm">
                  {adminPoints.map((p) => (
                    <li key={p} className="flex gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto space-y-3 pt-7">
                  <Link href={ROUTES.login} className={buttonVariants({ size: "lg", fullWidth: true })}>
                    Login as Admin
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                  <Link href={ROUTES.register} className={buttonVariants({ variant: "outline", size: "lg", fullWidth: true })}>
                    Create admin account
                  </Link>
                </div>
              </div>

              {/* Employee */}
              <div className="flex flex-col rounded-3xl border border-indigo-200 bg-linear-to-b from-indigo-50 to-card p-7 shadow-sm dark:border-indigo-900/60 dark:from-indigo-950/40">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm dark:bg-indigo-500">
                  <Store className="size-6" aria-hidden />
                </span>
                <h3 className="mt-5 text-xl font-semibold">I&apos;m an Employee</h3>
                <p className="mt-1 text-sm text-muted-foreground">Store staff</p>
                <ul className="mt-5 space-y-2.5 text-sm">
                  {employeePoints.map((p) => (
                    <li key={p} className="flex gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto space-y-3 pt-7">
                  <a href={EMPLOYEE_LOGIN_URL} className={cn(employeeButton, "h-12 w-full px-6 text-base")}>
                    Login as Employee
                    <ArrowRight className="size-4" aria-hidden />
                  </a>
                  <p className="text-center text-xs text-muted-foreground">
                    No account? Ask your admin for your email and password.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final call to action ── */}
        <section className="px-4 pb-20 sm:px-6 sm:pb-24">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-linear-to-br from-brand-from to-brand-to px-6 py-14 text-center text-white shadow-xl sm:px-12">
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-white/10 blur-2xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 size-80 rounded-full bg-amber-300/15 blur-3xl" />
            <LogoMark className="relative mx-auto size-14 ring-white/30" />
            <h2 className="relative mt-6 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Fresher shelves. Less waste. More profit.
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-white/80">
              Set up your first store in a few minutes and give your team a simple way to stay ahead of every expiry date.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={ROUTES.register}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-base font-semibold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Get started free
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a
                href="#login"
                className="inline-flex h-12 items-center justify-center rounded-lg px-6 text-base font-medium text-white ring-1 ring-white/40 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                I already have an account
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo className="text-foreground" />
          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href={ROUTES.login} className="hover:text-foreground">Admin login</Link>
            <a href={EMPLOYEE_LOGIN_URL} className="hover:text-foreground">Employee login</a>
            <Link href={ROUTES.register} className="hover:text-foreground">Create account</Link>
          </nav>
          <p>© SmartExpiry</p>
        </div>
      </footer>
    </div>
  );
}
