// No "server-only" marker: the proxy (not a React Server Component) imports this to renew sessions.
import { prisma } from "@/lib/prisma";
import {
  refreshTokenTtlSeconds,
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/lib/auth/tokens";

export type IssuedTokens = { accessToken: string; refreshToken: string };

/**
 * Result of a refresh. `refreshToken` is null when only a new access token was
 * issued (the request raced another refresh); the browser keeps the refresh
 * cookie set by the request that won.
 */
export type RefreshedTokens = { accessToken: string; refreshToken: string | null };

/** How long a just-replaced refresh token is still accepted (parallel requests, several tabs). */
const ROTATION_GRACE_MS = 30_000;

/**
 * Starts a new session: issues an access + refresh token pair and stores the
 * refresh token hash on the employee row (replacing any previous session).
 */
export async function issueSession(employee: { id: string; email: string; name: string }): Promise<IssuedTokens> {
  const accessToken = await signAccessToken({ sub: employee.id, email: employee.email, name: employee.name });
  const { token: refreshToken } = await signRefreshToken(employee.id);

  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      refreshTokenHash: sha256(refreshToken),
      refreshTokenExpiresAt: new Date(Date.now() + refreshTokenTtlSeconds() * 1000),
      previousRefreshTokenHash: null,
      refreshTokenRotatedAt: null,
      lastLoginAt: new Date(),
    },
  });

  return { accessToken, refreshToken };
}

/**
 * Exchanges a refresh token for new tokens (rotation).
 *
 * - Current token → rotate (atomically: only one of several parallel requests wins).
 * - Token replaced < 30 s ago (lost the race) → new access token only.
 * - Anything else (older token, signed in elsewhere, logged out, expired,
 *   password changed or deactivated by the admin) → null: signed out.
 */
export async function rotateSession(refreshToken: string): Promise<RefreshedTokens | null> {
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) return null;

  const employee = await prisma.employee.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      refreshTokenHash: true,
      refreshTokenExpiresAt: true,
      previousRefreshTokenHash: true,
      refreshTokenRotatedAt: true,
    },
  });
  if (!employee || employee.status !== "ACTIVE" || !employee.refreshTokenHash) return null;

  const presented = sha256(refreshToken);
  const accessToken = () => signAccessToken({ sub: employee.id, email: employee.email, name: employee.name });
  const withinGrace = () =>
    !!employee.refreshTokenRotatedAt && Date.now() - employee.refreshTokenRotatedAt.getTime() < ROTATION_GRACE_MS;

  if (presented === employee.refreshTokenHash) {
    if (!employee.refreshTokenExpiresAt || employee.refreshTokenExpiresAt < new Date()) {
      await revokeSession(employee.id);
      return null;
    }

    const { token: next } = await signRefreshToken(employee.id);
    // Conditional update: succeeds only if nobody rotated this token meanwhile.
    const { count } = await prisma.employee.updateMany({
      where: { id: employee.id, refreshTokenHash: presented },
      data: {
        refreshTokenHash: sha256(next),
        refreshTokenExpiresAt: new Date(Date.now() + refreshTokenTtlSeconds() * 1000),
        previousRefreshTokenHash: presented,
        refreshTokenRotatedAt: new Date(),
      },
    });
    if (count === 0) return { accessToken: await accessToken(), refreshToken: null };
    return { accessToken: await accessToken(), refreshToken: next };
  }

  if (presented === employee.previousRefreshTokenHash && withinGrace()) {
    return { accessToken: await accessToken(), refreshToken: null };
  }

  return null;
}

export async function revokeSession(employeeId: string) {
  await prisma.employee.updateMany({
    where: { id: employeeId },
    data: {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      previousRefreshTokenHash: null,
      refreshTokenRotatedAt: null,
    },
  });
}
