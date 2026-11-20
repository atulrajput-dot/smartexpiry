"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { ROUTES } from "@/lib/auth/constants";
import { writeAuthCookies } from "@/lib/auth/cookies";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/lib/auth/password";
import { issueSession } from "@/lib/auth/session";
import { clearFailures, lockedMessage, lockedMinutes, recordFailure } from "@/lib/auth/throttle";
import { prisma } from "@/lib/prisma";
import { LoginSchema, type FormState, type LoginField } from "@/lib/validations/auth";

/** Developer hints for common setup problems — server log only, never shown in the UI. */
const DEV_HINTS: Record<string, string> = {
  P1000: "Database login failed: check the username/password in DATABASE_URL (.env).",
  P1001: "Database server unreachable: is PostgreSQL running on the host/port in DATABASE_URL?",
  P1003: "Database does not exist: run `npm run db:deploy` in smartexpiry-admin.",
  P2021: "Table missing: run `npm run db:deploy` in smartexpiry-admin, then `npm run db:generate` here.",
  P2022: "Column missing: run `npm run db:deploy` in smartexpiry-admin, then `npm run db:generate` here.",
};

function friendlyError(context: string, error: unknown) {
  const code =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.code
      : error instanceof Prisma.PrismaClientInitializationError
        ? error.errorCode
        : undefined;
  const hint = code ? DEV_HINTS[code] : undefined;
  console.error(`[${context}] failed${hint ? ` — ${hint}` : ""}`, error);
  return error instanceof Prisma.PrismaClientInitializationError || hint
    ? "We're having trouble connecting right now. Please try again in a few minutes."
    : "Something went wrong. Please try again.";
}

/** Only allow same-site relative paths as a post-login destination. */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : ROUTES.home;
}

/**
 * Employee sign-in with the email + password their admin created.
 * The password is checked against the bcrypt hash stored by the Admin app.
 */
export async function loginAction(_prev: FormState<LoginField>, formData: FormData): Promise<FormState<LoginField>> {
  const raw = { email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? "") };
  const values = { email: raw.email };

  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors, values };
  const { email, password } = parsed.data;
  const throttleKey = `employee:${email}`;

  let tokens;
  try {
    const locked = await lockedMinutes(throttleKey);
    if (locked > 0) return { status: "error", message: lockedMessage(locked), values };

    const employee = await prisma.employee.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, passwordHash: true, status: true },
    });

    // Always run bcrypt so response time doesn't reveal whether the email exists.
    const passwordOk = await verifyPassword(password, employee?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!employee || !passwordOk) {
      const lockedNow = await recordFailure(throttleKey);
      return { status: "error", message: lockedNow ? lockedMessage(lockedNow) : "Incorrect email or password.", values };
    }
    await clearFailures(throttleKey);
    // Only told after the correct password, so it can't be used to probe accounts.
    if (employee.status !== "ACTIVE") {
      return { status: "error", message: "Your account is inactive. Please contact your admin.", values };
    }

    tokens = await issueSession(employee);
  } catch (error) {
    return { status: "error", message: friendlyError("login", error), values };
  }

  writeAuthCookies(await cookies(), tokens);
  redirect(safeNext(formData.get("next")));
}
