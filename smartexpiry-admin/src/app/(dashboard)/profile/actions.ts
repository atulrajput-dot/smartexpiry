"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { writeAuthCookies } from "@/lib/auth/cookies";
import { requireAdmin } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { issueSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { FormState } from "@/lib/validations/auth";
import { ChangePasswordSchema, UpdateProfileSchema, type PasswordField, type ProfileField } from "@/lib/validations/profile";

/** Update the signed-in admin's name and contact number. Email stays the login and isn't changed here. */
export async function updateProfileAction(_prev: FormState<ProfileField>, formData: FormData): Promise<FormState<ProfileField>> {
  const admin = await requireAdmin();
  const values = { name: String(formData.get("name") ?? ""), phone: String(formData.get("phone") ?? "") };

  const parsed = UpdateProfileSchema.safeParse(values);
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors, values };
  const { name, phone } = parsed.data;

  try {
    const taken = await prisma.admin.findFirst({ where: { phone, NOT: { id: admin.id } }, select: { id: true } });
    if (taken) return { status: "error", errors: { phone: ["This contact number is already registered."] }, values };

    await prisma.admin.update({ where: { id: admin.id }, data: { name, phone } });
    refresh(); // sidebar / header show the new name right away
    return { status: "success", message: "Your profile was updated.", values: { name, phone } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", errors: { phone: ["This contact number is already registered."] }, values };
    }
    console.error("[profile:update] failed", error);
    return { status: "error", message: "We couldn't save your profile. Please try again.", values };
  }
}

/**
 * Change password: the current password is required. Afterwards the session is
 * re-issued, which signs out any other device that still had the old session.
 */
export async function changePasswordAction(_prev: FormState<PasswordField>, formData: FormData): Promise<FormState<PasswordField>> {
  const admin = await requireAdmin();
  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const { currentPassword, newPassword } = parsed.data;

  try {
    const row = await prisma.admin.findUnique({ where: { id: admin.id }, select: { passwordHash: true } });
    if (!row || !(await verifyPassword(currentPassword, row.passwordHash))) {
      return { status: "error", errors: { currentPassword: ["Your current password is incorrect."] } };
    }
    if (await verifyPassword(newPassword, row.passwordHash)) {
      return { status: "error", errors: { newPassword: ["Choose a password different from your current one."] } };
    }

    await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(newPassword) } });
    const tokens = await issueSession({ id: admin.id, email: admin.email, name: admin.name });
    writeAuthCookies(await cookies(), tokens);
    return { status: "success", message: "Password changed. Other devices have been signed out." };
  } catch (error) {
    console.error("[profile:password] failed", error);
    return { status: "error", message: "We couldn't change your password. Please try again." };
  }
}
