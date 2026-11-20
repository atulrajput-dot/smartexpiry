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

/**
 * How long a just-replaced refresh token is still accepted. Covers parallel
 * requests (prefetches, several tabs) that were sent with the old cookie
 * before the rotated one arrived.
 */
const ROTATION_GRACE_MS = 30_000;

/**
 * Starts a new session: issues an access + refresh token pair and stores the
 * refresh token hash on the admin row (replacing any previous session).
 */
export async function issueSession(admin: { id: string; email: string; name: string }): Promise<IssuedTokens> {
  const accessToken = await signAccessToken({ sub: admin.id, email: admin.email, name: admin.name });
  const { token: refreshToken } = await signRefreshToken(admin.id);

  await prisma.admin.update({
    where: { id: admin.id },
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
 * Exchanges a refresh token for new tokens (rotation): the presented refresh
 * token is replaced, so each one is normally used once.
 *
 * - Current token → rotate (atomically: only one of several parallel requests wins).
 * - Token replaced < 30 s ago (lost the race) → new access token only.
 * - Anything else (older token, other device signed in since, logged out,
 *   expired) → null, the caller signs the user out.
 *
 * One session per admin: signing in on another device/browser replaces the
 * stored token, so the older device is signed out at its next refresh.
 */
export async function rotateSession(refreshToken: string): Promise<RefreshedTokens | null> {
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) return null;

  const admin = await prisma.admin.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      refreshTokenHash: true,
      refreshTokenExpiresAt: true,
      previousRefreshTokenHash: true,
      refreshTokenRotatedAt: true,
    },
  });
  if (!admin || !admin.emailVerified || !admin.refreshTokenHash) return null;

  const presented = sha256(refreshToken);
  const accessToken = () => signAccessToken({ sub: admin.id, email: admin.email, name: admin.name });
  const withinGrace = () =>
    !!admin.refreshTokenRotatedAt && Date.now() - admin.refreshTokenRotatedAt.getTime() < ROTATION_GRACE_MS;

  if (presented === admin.refreshTokenHash) {
    if (!admin.refreshTokenExpiresAt || admin.refreshTokenExpiresAt < new Date()) {
      await revokeSession(admin.id);
      return null;
    }

    const { token: next } = await signRefreshToken(admin.id);
    // Conditional update: succeeds only if nobody rotated this token meanwhile.
    const { count } = await prisma.admin.updateMany({
      where: { id: admin.id, refreshTokenHash: presented },
      data: {
        refreshTokenHash: sha256(next),
        refreshTokenExpiresAt: new Date(Date.now() + refreshTokenTtlSeconds() * 1000),
        previousRefreshTokenHash: presented,
        refreshTokenRotatedAt: new Date(),
      },
    });
    // Lost the race to a parallel request: that one set the new refresh cookie.
    if (count === 0) return { accessToken: await accessToken(), refreshToken: null };
    return { accessToken: await accessToken(), refreshToken: next };
  }

  if (presented === admin.previousRefreshTokenHash && withinGrace()) {
    return { accessToken: await accessToken(), refreshToken: null };
  }

  return null;
}

export async function revokeSession(adminId: string) {
  await prisma.admin.update({
    where: { id: adminId },
    data: {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      previousRefreshTokenHash: null,
      refreshTokenRotatedAt: null,
    },
  });
}
