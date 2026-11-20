"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/auth/constants";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { getCurrentAdmin } from "@/lib/auth/dal";
import { revokeSession } from "@/lib/auth/session";

export async function logoutAction() {
  const admin = await getCurrentAdmin();
  if (admin) {
    try {
      await revokeSession(admin.id);
    } catch (error) {
      console.error("[logout] could not revoke session", error);
    }
  }
  clearAuthCookies(await cookies());
  redirect(ROUTES.login);
}
