"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

/** Shows the "Email verified" toast once after sign-up, then drops ?welcome=1 from the URL. */
export function WelcomeToast() {
  const shown = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast.success("Email verified", { description: "Your admin account is active. Welcome to SmartExpiry!" });
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  return null;
}
