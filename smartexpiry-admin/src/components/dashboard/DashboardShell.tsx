"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Bell, Building2, ChevronLeft, LayoutDashboard, ScrollText, Sparkles, Users } from "lucide-react";
import { AskAiBar } from "@/components/assistant/AskAiBar";
import { Logo } from "@/components/brand/Logo";
import { ProfileMenu } from "@/components/dashboard/ProfileMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Toaster } from "@/components/ui/Toast";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { cn } from "@/lib/utils";

type Admin = { name: string; email: string };

/**
 * Single source of navigation: drives both the desktop sidebar and the mobile
 * bottom bar. Add future pages here and they appear in both.
 */
const navigation: { label: string; short?: string; href: string; Icon: LucideIcon; badge?: "alerts" }[] = [
  { label: "Home", href: "/dashboard", Icon: LayoutDashboard },
  { label: "Stores", href: "/stores", Icon: Building2 },
  { label: "Employees", href: "/employees", Icon: Users },
  { label: "Notifications", short: "Alerts", href: "/notifications", Icon: Bell, badge: "alerts" },
  { label: "Activity", href: "/activity", Icon: ScrollText },
];

/** "99+" style count for badges. */
const badgeText = (n: number) => (n > 99 ? "99+" : String(n));

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

export function DashboardShell({ admin, alertCount = 0, children }: { admin: Admin; alertCount?: number; children: ReactNode }) {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const pathname = usePathname();
  // The AI chat page fills the whole main area and has its own input, so no floating bar there.
  const onAssistant = pathname === "/assistant" || pathname.startsWith("/assistant/");

  return (
    <div className="min-h-dvh bg-background lg:flex">
      <Toaster />
      {/* ───────────── Desktop sidebar ───────────── */}
      <aside
        className={cn(
          "sticky top-0 z-40 hidden h-dvh shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex",
          collapsed ? "w-20" : "w-72",
        )}
      >
        {/* Collapse toggle sitting on the sidebar's right border */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3.5 top-[26px] z-10 flex size-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className={cn("size-4 transition-transform duration-200", collapsed && "rotate-180")} aria-hidden />
        </button>

        <div className={cn("flex h-20 shrink-0 items-center border-b border-border", collapsed ? "justify-center px-2" : "px-5")}>
          <Link href="/dashboard" aria-label="SmartExpiry home">
            <Logo className={cn(collapsed && "[&>span:last-child]:hidden")} />
          </Link>
        </div>

        <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          {navigation.map((item) => (
            <SidebarItem key={item.href} {...item} badge={item.badge ? alertCount : 0} active={isActive(pathname, item.href)} collapsed={collapsed} />
          ))}
          <div className="!mt-4 border-t border-border pt-4">
            <SidebarItem label="Ask AI" href="/assistant" Icon={Sparkles} active={onAssistant} collapsed={collapsed} />
          </div>
        </nav>

        <div className={cn("space-y-3 border-t border-border p-3", collapsed && "flex flex-col items-center")}>
          {collapsed ? <ThemeToggle variant="vertical" /> : <ThemeToggle variant="full" />}
          <ProfileMenu admin={admin} placement={collapsed ? "collapsed" : "sidebar"} />
        </div>
      </aside>

      {/* ───────────── Main column ───────────── */}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        {/* Mobile top bar: logo + profile (theme + logout live in the profile menu) */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:hidden">
          <Link href="/dashboard" aria-label="SmartExpiry home">
            <Logo />
          </Link>
          <ProfileMenu admin={admin} placement="header" />
        </header>

        {onAssistant ? (
          <main className="h-[calc(100dvh-4rem-4.5rem-env(safe-area-inset-bottom))] min-h-0 w-full lg:h-dvh">{children}</main>
        ) : (
          <>
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-6 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-4 lg:pt-9">{children}</main>
            <AskAiBar />
          </>
        )}
      </div>

      {/* ───────────── Mobile bottom navigation ───────────── */}
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
          {navigation.map(({ label, short, href, Icon, badge }) => {
            const active = isActive(pathname, href);
            const count = badge ? alertCount : 0;
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                      active ? "bg-secondary" : "group-hover:bg-muted",
                    )}
                  >
                    <span className="relative">
                      <Icon className="size-5" aria-hidden />
                      {count > 0 && (
                        <span className="absolute -right-2.5 -top-2 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-4 text-danger-foreground">
                          {badgeText(count)}
                        </span>
                      )}
                    </span>
                  </span>
                  {short ?? label}
                  {count > 0 && <span className="sr-only"> ({count} alerts)</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function SidebarItem({
  label,
  href,
  Icon,
  active,
  collapsed,
  badge = 0,
}: {
  label: string;
  href: string;
  Icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <span className="relative">
        <Icon className="size-5 shrink-0" aria-hidden />
        {collapsed && badge > 0 && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-danger ring-2 ring-card" aria-hidden />}
      </span>
      {!collapsed && <span className="flex-1">{label}</span>}
      {!collapsed && badge > 0 && (
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", active ? "bg-primary-foreground/20" : "bg-danger text-danger-foreground")}>
          {badgeText(badge)}
        </span>
      )}
      {badge > 0 && <span className="sr-only"> ({badge} alerts)</span>}
    </Link>
  );
}
