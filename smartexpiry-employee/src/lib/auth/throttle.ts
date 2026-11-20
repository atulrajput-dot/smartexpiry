import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Sign-in lockout, stored in the shared database so it works across server
 * restarts and both apps. After MAX_FAILURES wrong passwords within WINDOW the
 * key is locked for LOCK. A successful sign-in clears it.
 *
 * Keys are per account ("admin:a@b.com", "employee:a@b.com"), so an attacker
 * can't lock out other accounts and can't keep guessing one account.
 */
export const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

/** Minutes left on a lock, or 0 when the key may try again. */
export async function lockedMinutes(key: string): Promise<number> {
  const row = await prisma.loginThrottle.findUnique({ where: { key }, select: { lockedUntil: true } });
  if (!row?.lockedUntil) return 0;
  const ms = row.lockedUntil.getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
}

/** Records a failed attempt. Returns minutes locked if this failure triggered a lock, else 0. */
export async function recordFailure(key: string): Promise<number> {
  const now = new Date();
  const row = await prisma.loginThrottle.findUnique({ where: { key } });
  const fresh = !row || now.getTime() - row.windowStart.getTime() > WINDOW_MS || (row.lockedUntil && row.lockedUntil < now);
  const failures = fresh ? 1 : row.failures + 1;
  const lockedUntil = failures >= MAX_FAILURES ? new Date(now.getTime() + LOCK_MS) : null;

  await prisma.loginThrottle.upsert({
    where: { key },
    create: { key, failures, windowStart: now, lockedUntil },
    update: { failures, windowStart: fresh ? now : row!.windowStart, lockedUntil },
  });
  return lockedUntil ? Math.ceil(LOCK_MS / 60_000) : 0;
}

export async function clearFailures(key: string) {
  await prisma.loginThrottle.deleteMany({ where: { key } });
}

export const lockedMessage = (minutes: number) =>
  `Too many incorrect attempts. For your security, sign-in is paused for ${minutes} minute${minutes === 1 ? "" : "s"}.`;
