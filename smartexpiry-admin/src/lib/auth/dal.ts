import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ACCESS_COOKIE, ROUTES } from "@/lib/auth/constants";
import { verifyAccessToken } from "@/lib/auth/tokens";

/**
 * Data Access Layer: the single place that turns the request's access token
 * into an admin. Server Components and Server Actions must call this instead
 * of trusting the proxy alone.
 */

export type CurrentAdmin = {
  id: string;
  name: string;
  email: string;
  phone: string;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
};

/** Returns the signed-in admin, or null. Memoised per request. */
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin | null> => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  const admin = await prisma.admin.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      emailVerified: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
      refreshTokenHash: true,
    },
  });
  // A null refresh hash means the admin logged out / the session was revoked.
  if (!admin || !admin.emailVerified || !admin.refreshTokenHash) return null;

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    emailVerifiedAt: admin.emailVerifiedAt,
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
  };
});

/**
 * Like getCurrentAdmin, but sends signed-out visitors to login. Goes through
 * /api/auth/session-expired so stale cookies are cleared first (otherwise the
 * proxy would see a still-valid access JWT and bounce back to the dashboard).
 */
export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(ROUTES.sessionExpired);
  return admin;
}
