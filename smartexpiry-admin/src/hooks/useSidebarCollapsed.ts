"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Remembers whether the desktop sidebar is collapsed (per browser). */
const KEY = "se-sidebar-collapsed";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback); // sync across tabs
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function read() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false; // private mode / blocked storage
  }
}

export function useSidebarCollapsed() {
  // Server render (and hydration) assume "expanded"; the saved value applies right after.
  const collapsed = useSyncExternalStore(subscribe, read, () => false);

  const setCollapsed = useCallback((value: boolean) => {
    try {
      localStorage.setItem(KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
    listeners.forEach((listener) => listener());
  }, []);

  return [collapsed, setCollapsed] as const;
}
