"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ROUTES, VERIFICATION_RESEND_COOLDOWN_SECONDS } from "@/lib/auth/constants";
import { writeAuthCookies } from "@/lib/auth/cookies";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "@/lib/auth/password";
import { issueSession } from "@/lib/auth/session";
import { requestPasswordReset, resetPasswordWithCode } from "@/lib/auth/password-reset";
import { clearFailures, lockedMessage, lockedMinutes, recordFailure } from "@/lib/auth/throttle";
import { sendVerificationOtp, verifyOtp } from "@/lib/auth/verification";
import {
  ForgotPasswordSchema,
  LoginSchema,
  ResetPasswordSchema,
  type ResetField,
  RegisterSchema,
  ResendVerificationSchema,
  VerifyOtpSchema,
  type FormState,
  type LoginField,
  type RegisterField,
} from "@/lib/validations/auth";

/* Messages shown to the user — plain language, no technical details. */
const MESSAGES = {
  unavailable: "We're having trouble connecting right now. Please try again in a few minutes.",
  generic: "Something went wrong. Please try again.",
};

/** Developer hints for common setup problems — written to the server log only. */
const DEV_HINTS: Record<string, string> = {
  P1000: "Database login failed: check the username/password in DATABASE_URL (.env).",
  P1001: "Database server unreachable: is PostgreSQL running on the host/port in DATABASE_URL?",
  P1002: "Database server timed out: check that PostgreSQL is running and reachable.",
  P1003: "Database does not exist: run `npm run db:migrate`.",
  P2021: "Table missing: run `npm run db:migrate`.",
};

/**
 * Logs the full error (with a setup hint when one applies) for developers and
 * returns a friendly message for the form. Technical details never reach the UI.
 */
function handleServerError(context: string, error: unknown) {
  const code =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.code
      : error instanceof Prisma.PrismaClientInitializationError
        ? error.errorCode
        : undefined;
  const hint = code ? DEV_HINTS[code] : undefined;

  console.error(`[${context}] failed${hint ? ` — ${hint}` : ""}`, error);

  const isConnectionProblem =
    error instanceof Prisma.PrismaClientInitializationError || (code ? code in DEV_HINTS : false);
  return isConnectionProblem ? MESSAGES.unavailable : MESSAGES.generic;
}

/** Only allow same-site relative paths as a post-login destination. */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : ROUTES.home;
}

function verifyEmailUrl(email: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ email, ...extra });
  return `${ROUTES.verifyEmail}?${params}`;
}

/* ───────────────────────────── Register ───────────────────────────── */

export async function registerAction(
  _prev: FormState<RegisterField>,
  formData: FormData,
): Promise<FormState<RegisterField>> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };
  const values = { name: raw.name, email: raw.email, phone: raw.phone };

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
      values,
    };
  }
  const { name, email, phone, password } = parsed.data;

  let admin: { id: string; name: string; email: string };
  try {
    const existing = await prisma.admin.findFirst({
      where: { OR: [{ email }, { phone }] },
      select: { email: true, phone: true },
    });
    if (existing) {
      const errors: Partial<Record<RegisterField, string[]>> = {};
      if (existing.email === email) errors.email = ["An account with this email already exists."];
      if (existing.phone === phone) errors.phone = ["This contact number is already registered."];
      return { status: "error", errors, values };
    }

    admin = await prisma.admin.create({
      data: { name, email, phone, passwordHash: await hashPassword(password) },
      select: { id: true, name: true, email: true },
    });
  } catch (error) {
    // Two registrations racing for the same email/phone.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", message: "This email or contact number is already registered.", values };
    }
    return { status: "error", message: handleServerError("register", error), values };
  }

  let mailFailed = false;
  try {
    await sendVerificationOtp(admin);
  } catch (error) {
    // The account exists; the admin can request a new code from the next page.
    handleServerError("register: send OTP", error);
    mailFailed = true;
  }

  redirect(verifyEmailUrl(admin.email, mailFailed ? { mail: "failed" } : { sent: "1" }));
}

/* ───────────────────────────── Login ───────────────────────────── */

/** True when the last code was sent recently enough that we shouldn't send another. */
function inResendCooldown(sentAt: Date | null) {
  return !!sentAt && Date.now() - sentAt.getTime() < VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000;
}

export async function loginAction(
  _prev: FormState<LoginField>,
  formData: FormData,
): Promise<FormState<LoginField>> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const values = { email: raw.email };

  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors, values };
  }
  const { email, password } = parsed.data;
  const throttleKey = `admin:${email}`;

  let tokens;
  let verifyRedirect: string | null = null;
  try {
    const locked = await lockedMinutes(throttleKey);
    if (locked > 0) return { status: "error", message: lockedMessage(locked), values };

    const admin = await prisma.admin.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        emailVerified: true,
        emailOtpSentAt: true,
      },
    });

    // Always run bcrypt so response time doesn't reveal whether the email exists.
    const passwordOk = await verifyPassword(password, admin?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!admin || !passwordOk) {
      const lockedNow = await recordFailure(throttleKey);
      return { status: "error", message: lockedNow ? lockedMessage(lockedNow) : "Incorrect email or password.", values };
    }
    await clearFailures(throttleKey);

    if (!admin.emailVerified) {
      // Correct password but unverified: send a fresh code and go to the OTP page.
      let sent = false;
      if (!inResendCooldown(admin.emailOtpSentAt)) {
        try {
          await sendVerificationOtp(admin);
          sent = true;
        } catch (error) {
          handleServerError("login: send OTP", error);
        }
      }
      verifyRedirect = verifyEmailUrl(admin.email, { from: "login", ...(sent ? { sent: "1" } : {}) });
    } else {
      tokens = await issueSession(admin);
    }
  } catch (error) {
    return { status: "error", message: handleServerError("login", error), values };
  }

  if (verifyRedirect) redirect(verifyRedirect);
  writeAuthCookies(await cookies(), tokens!);
  redirect(safeNext(formData.get("next")));
}

/* ───────────────────────────── Verify OTP ───────────────────────────── */

export async function verifyOtpAction(
  _prev: FormState<"otp">,
  formData: FormData,
): Promise<FormState<"otp">> {
  const parsed = VerifyOtpSchema.safeParse({
    email: formData.get("email") ?? "",
    otp: formData.get("otp") ?? "",
  });
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      errors: { otp: errors.otp ?? ["Something is wrong with this page. Please sign in again."] },
    };
  }
  const { email, otp } = parsed.data;

  let tokens;
  try {
    const result = await verifyOtp(email, otp);

    if (!result.ok) {
      switch (result.reason) {
        case "invalid":
          return {
            status: "error",
            errors: {
              otp: [
                `That code isn't right. ${result.attemptsLeft} ${result.attemptsLeft === 1 ? "attempt" : "attempts"} left.`,
              ],
            },
          };
        case "expired":
          return { status: "error", message: "This code has expired. Request a new code below." };
        case "too_many_attempts":
          return { status: "error", message: "Too many incorrect attempts. Request a new code below." };
        case "no_code":
          return { status: "error", message: "No active code for this account. Request a new code below." };
        case "already_verified":
          return { status: "success", message: "Your email is already verified. Please sign in." };
      }
    }

    tokens = await issueSession(result.admin);
  } catch (error) {
    return { status: "error", message: handleServerError("verify OTP", error) };
  }

  writeAuthCookies(await cookies(), tokens);
  redirect(`${ROUTES.home}?welcome=1`);
}

/* ─────────────────────── Resend verification code ─────────────────────── */

export async function resendVerificationAction(
  _prev: FormState<"email">,
  formData: FormData,
): Promise<FormState<"email">> {
  const parsed = ResendVerificationSchema.safeParse({ email: formData.get("email") ?? "" });
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }
  const { email } = parsed.data;

  // Same answer whether or not the account exists, to avoid leaking emails.
  const generic: FormState<"email"> = {
    status: "success",
    message: `A new code has been sent to ${email} if it belongs to an unverified account.`,
  };

  try {
    const admin = await prisma.admin.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, emailVerified: true, emailOtpSentAt: true },
    });
    if (!admin || admin.emailVerified || inResendCooldown(admin.emailOtpSentAt)) return generic;

    await sendVerificationOtp(admin);
    return generic;
  } catch (error) {
    handleServerError("resend OTP", error);
    return { status: "error", message: "We couldn't send the code right now. Please try again in a few minutes." };
  }
}

/* ───────────────────────────── Forgot / reset password ───────────────────────────── */

/**
 * Step 1: email a reset code. Always continues to the code page with the same
 * message, whether or not the email has an account (no account probing).
 */
export async function forgotPasswordAction(_prev: FormState<"email">, formData: FormData): Promise<FormState<"email">> {
  const raw = String(formData.get("email") ?? "");
  const parsed = ForgotPasswordSchema.safeParse({ email: raw });
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors, values: { email: raw } };

  try {
    await requestPasswordReset(parsed.data.email);
  } catch (error) {
    return { status: "error", message: handleServerError("forgot-password", error), values: { email: raw } };
  }
  redirect(`${ROUTES.resetPassword}?${new URLSearchParams({ email: parsed.data.email, sent: "1" })}`);
}

/** Step 2: check the code and set the new password, then sign in fresh. */
export async function resetPasswordAction(_prev: FormState<ResetField>, formData: FormData): Promise<FormState<ResetField>> {
  const parsed = ResetPasswordSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    otp: String(formData.get("otp") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    if (errors.email) return { status: "error", message: "Something is wrong with this page. Start again from “Forgot password”." };
    return { status: "error", errors };
  }
  const { email, otp, password } = parsed.data;

  try {
    const result = await resetPasswordWithCode(email, otp, password);
    if (!result.ok) {
      const message =
        result.reason === "invalid"
          ? result.attemptsLeft > 0
            ? `That code isn't right. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? "" : "s"} left.`
            : "That code isn't right. Request a new code."
          : result.reason === "expired"
            ? "This code has expired. Request a new code."
            : result.reason === "too_many_attempts"
              ? "Too many wrong codes. Request a new code."
              : "No reset was requested for this email. Request a new code.";
      return { status: "error", errors: { otp: [message] } };
    }
  } catch (error) {
    return { status: "error", message: handleServerError("reset-password", error) };
  }
  redirect(`${ROUTES.login}?reset=1`);
}

/** "Send a new code" on the reset page. */
export async function resendResetCodeAction(email: string): Promise<{ ok: boolean; message: string }> {
  const parsed = ForgotPasswordSchema.safeParse({ email });
  if (!parsed.success) return { ok: false, message: "Start again from “Forgot password”." };
  try {
    await requestPasswordReset(parsed.data.email);
    return { ok: true, message: "If this email has an account, a new code is on its way. It can take a minute to arrive." };
  } catch (error) {
    return { ok: false, message: handleServerError("reset-password: resend", error) };
  }
}
