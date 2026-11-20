import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mail/mailer";
import { verificationOtpEmail } from "@/lib/mail/templates";

/** Wrong guesses allowed per code before a new one must be requested. */
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_LENGTH = 6;

/**
 * Keyed hash of the code. A plain SHA-256 of a 6-digit number could be reversed
 * by trying all 1,000,000 values; the HMAC secret prevents that if the DB leaks.
 */
function hashOtp(adminId: string, otp: string) {
  return createHmac("sha256", env().ACCESS_TOKEN_SECRET).update(`${adminId}:${otp}`).digest("hex");
}

function generateOtp() {
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

/**
 * Creates a fresh code (replacing any older one, resetting attempts), stores
 * only its hash, and emails it to the admin.
 */
export async function sendVerificationOtp(admin: { id: string; name: string; email: string }) {
  const { EMAIL_OTP_TTL_MINUTES } = env();
  const otp = generateOtp();

  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      emailOtpHash: hashOtp(admin.id, otp),
      emailOtpExpiresAt: new Date(Date.now() + EMAIL_OTP_TTL_MINUTES * 60 * 1000),
      emailOtpSentAt: new Date(),
      emailOtpAttempts: 0,
    },
  });

  await sendMail({
    to: admin.email,
    ...verificationOtpEmail({ name: admin.name, otp, expiresInMinutes: EMAIL_OTP_TTL_MINUTES }),
  });
}

export type OtpCheckResult =
  | { ok: true; admin: { id: string; name: string; email: string } }
  | { ok: false; reason: "invalid"; attemptsLeft: number }
  | { ok: false; reason: "expired" | "too_many_attempts" | "already_verified" | "no_code" };

/**
 * Checks a code for the given email. On success the admin is marked verified
 * and the code is cleared; on a wrong code the attempt counter goes up.
 */
export async function verifyOtp(email: string, otp: string): Promise<OtpCheckResult> {
  const admin = await prisma.admin.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      emailOtpHash: true,
      emailOtpExpiresAt: true,
      emailOtpAttempts: true,
    },
  });

  // Unknown email is reported like a wrong code, so emails can't be probed.
  if (!admin) return { ok: false, reason: "invalid", attemptsLeft: OTP_MAX_ATTEMPTS - 1 };
  if (admin.emailVerified) return { ok: false, reason: "already_verified" };
  if (!admin.emailOtpHash || !admin.emailOtpExpiresAt) return { ok: false, reason: "no_code" };
  if (admin.emailOtpAttempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };
  if (admin.emailOtpExpiresAt < new Date()) return { ok: false, reason: "expired" };

  const expected = Buffer.from(admin.emailOtpHash, "hex");
  const actual = Buffer.from(hashOtp(admin.id, otp), "hex");
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!matches) {
    // Atomic increment so parallel guesses can't bypass the limit.
    const updated = await prisma.admin.update({
      where: { id: admin.id },
      data: { emailOtpAttempts: { increment: 1 } },
      select: { emailOtpAttempts: true },
    });
    const attemptsLeft = Math.max(0, OTP_MAX_ATTEMPTS - updated.emailOtpAttempts);
    return attemptsLeft === 0
      ? { ok: false, reason: "too_many_attempts" }
      : { ok: false, reason: "invalid", attemptsLeft };
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      emailOtpHash: null,
      emailOtpExpiresAt: null,
      emailOtpAttempts: 0,
    },
  });

  return { ok: true, admin: { id: admin.id, name: admin.name, email: admin.email } };
}
