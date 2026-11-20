"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import { logoutAction } from "@/app/(dashboard)/actions";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

type Admin = { name: string; email: string };

export function adminInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

type ProfileMenuProps = {
  admin: Admin;
  /**
   * sidebar:   full-width profile button at the bottom of the sidebar; menu opens above it
   * collapsed: avatar-only button in the collapsed sidebar; menu opens to the right
   * header:    avatar button in the mobile top bar; menu drops down (includes the theme switch)
   */
  placement: "sidebar" | "collapsed" | "header";
};

/** Profile button that opens a small menu with the admin's details and Log out. */
export function ProfileMenu({ admin, placement }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const initials = adminInitials(admin.name);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const avatar = (size: string) => (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-from to-brand-to font-semibold text-white",
        size,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${admin.name}`}
        title={placement === "collapsed" ? admin.name : undefined}
        className={cn(
          "flex items-center gap-3 rounded-xl text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          placement === "sidebar" && "w-full border border-border bg-muted/50 p-2.5 hover:bg-muted",
          placement === "collapsed" && "mx-auto p-1 hover:bg-muted",
          placement === "header" && "rounded-full p-0.5 hover:ring-2 hover:ring-border",
          open && placement === "sidebar" && "bg-muted",
        )}
      >
        {avatar("size-9 text-sm")}
        {placement === "sidebar" && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{admin.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{admin.email}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className={cn(
            "absolute z-50 w-64 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl",
            "animate-pop-in",
            placement === "sidebar" && "bottom-full left-0 mb-2 w-full",
            placement === "collapsed" && "bottom-0 left-full ml-3",
            placement === "header" && "right-0 top-full mt-2",
          )}
        >
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            {avatar("size-10 text-sm")}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{admin.name}</p>
              <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
            </div>
          </div>

          {/* On mobile there's no sidebar, so the theme switch lives here. */}
          {placement === "header" && (
            <div className="border-t border-border px-2.5 py-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Theme</p>
              <ThemeToggle variant="full" />
            </div>
          )}

          <div className="space-y-0.5 border-t border-border pt-1.5">
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              <UserRound className="size-4 text-muted-foreground" aria-hidden />
              My profile
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-soft focus-visible:bg-danger-soft focus-visible:outline-none"
              >
                <LogOut className="size-4" aria-hidden />
                Log out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
