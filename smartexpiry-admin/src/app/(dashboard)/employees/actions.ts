"use server";

import { refresh } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { hashPassword } from "@/lib/auth/password";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret-box";
import {
  CreateEmployeeSchema,
  MAX_PROFILE_IMAGE_BYTES,
  UpdateEmployeeSchema,
  type CreateEmployeeResult,
  type UpdateEmployeeResult,
} from "@/lib/validations/employee";

/** Detects the real image type from the file's first bytes (don't trust the browser's label). */
function sniffImageType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

async function readProfileImage(
  value: FormDataEntryValue | null,
): Promise<{ ok: true; image: { bytes: Uint8Array<ArrayBuffer>; type: string } | null } | { ok: false; error: string }> {
  if (!(value instanceof File) || value.size === 0) return { ok: true, image: null };
  if (value.size > MAX_PROFILE_IMAGE_BYTES) return { ok: false, error: "Profile image must be 2 MB or smaller." };

  const bytes = new Uint8Array(await value.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return { ok: false, error: "Upload a PNG, JPG or WEBP image." };
  return { ok: true, image: { bytes, type } };
}

/**
 * Creates an employee for the signed-in admin and assigns them to stores.
 * Ownership comes from the session, never from the form; every store ID is
 * checked to belong to this admin.
 */
export async function createEmployeeAction(formData: FormData): Promise<CreateEmployeeResult> {
  const admin = await requireAdmin();

  const parsed = CreateEmployeeSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? ""),
    designation: String(formData.get("designation") ?? ""),
    storeIds: formData.getAll("storeIds").map(String),
  });
  const imageResult = await readProfileImage(formData.get("profileImage"));

  if (!parsed.success || !imageResult.ok) {
    return {
      ok: false,
      errors: {
        ...(parsed.success ? {} : parsed.error.flatten().fieldErrors),
        ...(imageResult.ok ? {} : { profileImage: [imageResult.error] }),
      },
    };
  }

  const { name, email, phone, password, designation, storeIds } = parsed.data;
  const image = imageResult.image;

  try {
    // Every selected store must belong to this admin.
    const ownedStores = await prisma.store.count({ where: { adminId: admin.id, id: { in: storeIds } } });
    if (ownedStores !== storeIds.length) {
      return { ok: false, errors: { storeIds: ["One or more selected stores are no longer available. Refresh and try again."] } };
    }

    if (await prisma.employee.findUnique({ where: { email }, select: { id: true } })) {
      return { ok: false, errors: { email: ["An employee with this email already exists."] } };
    }

    const passwordHash = await hashPassword(password);

    const employee = await prisma.$transaction(async (tx) => {
      // Incrementing the admin's counter serializes concurrent creates → unique EMP codes.
      const { employeeCodeCounter } = await tx.admin.update({
        where: { id: admin.id },
        data: { employeeCodeCounter: { increment: 1 } },
        select: { employeeCodeCounter: true },
      });

      return tx.employee.create({
        data: {
          adminId: admin.id,
          employeeCode: `EMP-${String(employeeCodeCounter).padStart(3, "0")}`,
          name,
          email,
          phone,
          passwordHash,
          passwordEncrypted: encryptSecret(password),
          designation,
          profileImage: image?.bytes ?? null,
          profileImageType: image?.type ?? null,
          stores: { create: storeIds.map((storeId) => ({ storeId })) },
        },
        select: { id: true, name: true, employeeCode: true },
      });
    });

    // Re-render the Employees page in this same response so the new row shows up.
    refresh();
    return { ok: true, employee };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, errors: { email: ["An employee with this email already exists."] } };
    }
    console.error("[employee:create] failed", error);
    return { ok: false, message: "We couldn't create the employee. Please try again." };
  }
}

export type RevealPasswordResult = { ok: true; password: string } | { ok: false; message: string };

/**
 * Returns an employee's password to the admin who owns them. Called only when
 * the admin clicks "Show"/"Copy", so passwords never ship with the table HTML.
 */
export async function revealEmployeePasswordAction(employeeId: string): Promise<RevealPasswordResult> {
  const admin = await requireAdmin();
  if (typeof employeeId !== "string" || !employeeId) return { ok: false, message: "Employee not found." };

  try {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, adminId: admin.id },
      select: { passwordEncrypted: true },
    });
    if (!employee) return { ok: false, message: "Employee not found." };
    if (!employee.passwordEncrypted) {
      return { ok: false, message: "This password can't be shown (the employee changed it, or it was set before viewing was available). Use Edit to set a new one." };
    }
    return { ok: true, password: decryptSecret(employee.passwordEncrypted) };
  } catch (error) {
    console.error("[employee:reveal-password] failed", error);
    return { ok: false, message: "Couldn't load the password. Please try again." };
  }
}

/* ─────────────────────────────── Update ─────────────────────────────── */

/**
 * Updates one of the signed-in admin's employees. Blank password keeps the
 * current one; store assignments are replaced with the submitted set.
 */
export async function updateEmployeeAction(formData: FormData): Promise<UpdateEmployeeResult> {
  const admin = await requireAdmin();

  const parsed = UpdateEmployeeSchema.safeParse({
    employeeId: String(formData.get("employeeId") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? ""),
    designation: String(formData.get("designation") ?? ""),
    status: String(formData.get("status") ?? ""),
    removeImage: formData.get("removeImage") === "1",
    storeIds: formData.getAll("storeIds").map(String),
  });
  const imageResult = await readProfileImage(formData.get("profileImage"));

  if (!parsed.success || !imageResult.ok) {
    return {
      ok: false,
      errors: {
        ...(parsed.success ? {} : parsed.error.flatten().fieldErrors),
        ...(imageResult.ok ? {} : { profileImage: [imageResult.error] }),
      },
    };
  }

  const { employeeId, name, email, phone, password, designation, status, removeImage, storeIds } = parsed.data;
  const image = imageResult.image;

  try {
    const existing = await prisma.employee.findFirst({
      where: { id: employeeId, adminId: admin.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, message: "This employee no longer exists. Refresh the page." };

    const ownedStores = await prisma.store.count({ where: { adminId: admin.id, id: { in: storeIds } } });
    if (ownedStores !== storeIds.length) {
      return { ok: false, errors: { storeIds: ["One or more selected stores are no longer available. Refresh and try again."] } };
    }

    const emailOwner = await prisma.employee.findUnique({ where: { email }, select: { id: true } });
    if (emailOwner && emailOwner.id !== employeeId) {
      return { ok: false, errors: { email: ["An employee with this email already exists."] } };
    }

    const passwordData = password
      ? { passwordHash: await hashPassword(password), passwordEncrypted: encryptSecret(password) }
      : {};
    // New upload wins; otherwise "Remove photo" clears it; otherwise keep the current one.
    const imageData = image
      ? { profileImage: image.bytes, profileImageType: image.type }
      : removeImage
        ? { profileImage: null, profileImageType: null }
        : {};
    // New password or deactivated → end their Employee app session (they sign in again / can't).
    const signOutData =
      password || status !== "ACTIVE"
        ? { refreshTokenHash: null, refreshTokenExpiresAt: null, previousRefreshTokenHash: null, refreshTokenRotatedAt: null }
        : {};

    const employee = await prisma.$transaction(async (tx) => {
      await tx.employeeStore.deleteMany({ where: { employeeId, storeId: { notIn: storeIds } } });
      await tx.employeeStore.createMany({
        data: storeIds.map((storeId) => ({ employeeId, storeId })),
        skipDuplicates: true, // keeps the original assignedAt for stores that stay
      });
      return tx.employee.update({
        where: { id: employeeId },
        data: { name, email, phone, designation, status, ...passwordData, ...imageData, ...signOutData },
        select: { id: true, name: true, employeeCode: true },
      });
    });

    refresh();
    return { ok: true, employee };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, errors: { email: ["An employee with this email already exists."] } };
    }
    console.error("[employee:update] failed", error);
    return { ok: false, message: "We couldn't save the changes. Please try again." };
  }
}

/* ─────────────────────────────── Delete ─────────────────────────────── */

export type DeleteEmployeeResult = { ok: true } | { ok: false; message: string };

/** Permanently deletes one of the signed-in admin's employees (store assignments cascade). */
export async function deleteEmployeeAction(employeeId: string): Promise<DeleteEmployeeResult> {
  const admin = await requireAdmin();
  if (typeof employeeId !== "string" || !employeeId) return { ok: false, message: "Employee not found." };

  try {
    // Scoped by adminId, so another admin's employee can never be deleted.
    const { count } = await prisma.employee.deleteMany({ where: { id: employeeId, adminId: admin.id } });
    if (count === 0) return { ok: false, message: "This employee no longer exists." };
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("[employee:delete] failed", error);
    return { ok: false, message: "We couldn't delete the employee. Please try again." };
  }
}
