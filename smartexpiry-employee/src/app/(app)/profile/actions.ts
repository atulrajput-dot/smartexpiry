"use server";

import { cookies } from "next/headers";
import { writeAuthCookies } from "@/lib/auth/cookies";
import { requireEmployee } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { issueSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ChangePasswordSchema, type FormState, type PasswordField } from "@/lib/validations/auth";

/**
 * Employee changes their own password. Other devices are signed out (a new
 * session is issued for this one), and the admin's viewable copy is cleared:
 * it's the employee's private password now.
 */
export async function changePasswordAction(_prev: FormState<PasswordField>, formData: FormData): Promise<FormState<PasswordField>> {
  const me = await requireEmployee();
  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const { currentPassword, newPassword } = parsed.data;

  try {
    const row = await prisma.employee.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
    if (!row || !(await verifyPassword(currentPassword, row.passwordHash))) {
      return { status: "error", errors: { currentPassword: ["Your current password is incorrect."] } };
    }
    if (await verifyPassword(newPassword, row.passwordHash)) {
      return { status: "error", errors: { newPassword: ["Choose a password different from your current one."] } };
    }

    await prisma.employee.update({
      where: { id: me.id },
      data: { passwordHash: await hashPassword(newPassword), passwordEncrypted: null },
    });
    const tokens = await issueSession({ id: me.id, email: me.email, name: me.name });
    writeAuthCookies(await cookies(), tokens);
    return { status: "success", message: "Password changed. Other devices have been signed out." };
  } catch (error) {
    console.error("[profile:password] failed", error);
    return { status: "error", message: "We couldn't change your password. Please try again." };
  }
}
