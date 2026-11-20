import { CalendarClock, ScanBarcode, Store } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SITE_URL } from "@/lib/site";

const highlights = [
  { Icon: ScanBarcode, title: "Scan and add stock", text: "Scan a barcode and record quantity and expiry in seconds." },
  { Icon: CalendarClock, title: "Know what expires next", text: "See expiring and expired items before customers do." },
  { Icon: Store, title: "Your stores, your shift", text: "Work on the stores your admin assigned to you." },
];

/** Layout for the sign-in page. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Brand panel (desktop only) */}
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-brand-from to-brand-to p-10 text-white lg:flex lg:flex-col">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-sky-300/15 blur-3xl" />

        <a href={SITE_URL} className="relative w-fit" aria-label="SmartExpiry home">
          <Logo inverted />
        </a>

        <div className="relative my-auto max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold leading-tight">
              Every shelf, <br />
              checked on time.
            </h2>
            <p className="text-white/75">Sign in to keep your store&apos;s stock fresh and expiry dates under control.</p>
          </div>

          <ul className="space-y-5">
            {highlights.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/15">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-white/70">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">© SmartExpiry · Employee app</p>
      </aside>

      {/* Form area */}
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <a href={SITE_URL} className="lg:invisible" aria-label="SmartExpiry home">
            <Logo />
          </a>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
