import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/auth/password";
import { sendMail } from "@/lib/mail/mailer";
import { passwordResetOtpEmail } from "@/lib/mail/templates";
import { prisma } from "@/lib/prisma";

/** Wrong guesses allowed per reset code. */
export const RESET_MAX_ATTEMPTS = 5;
/** Minimum seconds between two reset emails for the same account. */
export const RESET_RESEND_COOLDOWN_SECONDS = 60;

// Different HMAC context from email verification so the two codes can never be swapped.
const hashCode = (adminId: string, otp: string) =>
  createHmac("sha256", env().ACCESS_TOKEN_SECRET).update(`reset:${adminId}:${otp}`).digest("hex");

/**
 * Emails a 6-digit reset code if the account exists and is verified.
 * Returns silently either way, so the form can't be used to find accounts.
 */
export async function requestPasswordReset(email: string) {
  const admin = await prisma.admin.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, emailVerified: true, passwordResetOtpSentAt: true },
  });
  if (!admin || !admin.emailVerified) return;
  if (admin.passwordResetOtpSentAt && Date.now() - admin.passwordResetOtpSentAt.getTime() < RESET_RESEND_COOLDOWN_SECONDS * 1000) return;

  const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const ttl = env().EMAIL_OTP_TTL_MINUTES;
  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      passwordResetOtpHash: hashCode(admin.id, otp),
      passwordResetOtpExpiresAt: new Date(Date.now() + ttl * 60 * 1000),
      passwordResetOtpSentAt: new Date(),
      passwordResetOtpAttempts: 0,
    },
  });
  await sendMail({ to: admin.email, ...passwordResetOtpEmail({ name: admin.name, otp, expiresInMinutes: ttl }) });
}

export type ResetResult =
  | { ok: true }
  | { ok: false; reason: "invalid"; attemptsLeft: number }
  | { ok: false; reason: "expired" | "too_many_attempts" | "no_code" };

/**
 * Checks the code and sets the new password. On success the code is cleared
 * and every session is signed out (the admin signs in again with the new password).
 */
export async function resetPasswordWithCode(email: string, otp: string, newPassword: string): Promise<ResetResult> {
  const admin = await prisma.admin.findUnique({
    where: { email },
    select: { id: true, passwordResetOtpHash: true, passwordResetOtpExpiresAt: true, passwordResetOtpAttempts: true },
  });
  if (!admin) return { ok: false, reason: "invalid", attemptsLeft: RESET_MAX_ATTEMPTS - 1 };
  if (!admin.passwordResetOtpHash || !admin.passwordResetOtpExpiresAt) return { ok: false, reason: "no_code" };
  if (admin.passwordResetOtpAttempts >= RESET_MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };
  if (admin.passwordResetOtpExpiresAt < new Date()) return { ok: false, reason: "expired" };

  const expected = Buffer.from(admin.passwordResetOtpHash, "hex");
  const actual = Buffer.from(hashCode(admin.id, otp), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    const { passwordResetOtpAttempts } = await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordResetOtpAttempts: { increment: 1 } },
      select: { passwordResetOtpAttempts: true },
    });
    return { ok: false, reason: "invalid", attemptsLeft: Math.max(0, RESET_MAX_ATTEMPTS - passwordResetOtpAttempts) };
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      passwordResetOtpHash: null,
      passwordResetOtpExpiresAt: null,
      passwordResetOtpAttempts: 0,
      // Sign out everywhere.
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      previousRefreshTokenHash: null,
      refreshTokenRotatedAt: null,
    },
  });
  await prisma.loginThrottle.deleteMany({ where: { key: `admin:${email}` } });
  return { ok: true };
}
