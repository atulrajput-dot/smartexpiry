import Link from "next/link";
import { BellRing, PackageCheck, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const highlights = [
  {
    Icon: PackageCheck,
    title: "Every product, one place",
    text: "Track stock and expiry dates across your store.",
  },
  {
    Icon: BellRing,
    title: "Alerts before it's too late",
    text: "Get notified while items can still be sold or used.",
  },
  {
    Icon: ShieldCheck,
    title: "Secure admin access",
    text: "Verified accounts and short-lived sessions.",
  },
];

/** Shared layout for login, registration and email verification. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Brand panel (desktop only) */}
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-brand-from to-brand-to p-10 text-white lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-amber-300/15 blur-3xl"
        />

        <Link href="/" className="relative w-fit">
          <Logo inverted />
        </Link>

        <div className="relative my-auto max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold leading-tight">
              Less waste. <br />
              Fresher shelves.
            </h2>
            <p className="text-white/75">
              The SmartExpiry admin console keeps your team ahead of every expiry date.
            </p>
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

        <p className="relative text-xs text-white/60">© SmartExpiry · Admin console</p>
      </aside>

      {/* Form area */}
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Link href="/" className="lg:invisible">
            <Logo />
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
