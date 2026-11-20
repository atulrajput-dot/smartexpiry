"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import {
  CreateStoreSchema,
  UpdateStoreSchema,
  type CreateStoreResult,
  type UpdateStoreResult,
} from "@/lib/validations/store";

function storeInitials(name: string) {
  const words = name.toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  if (words.length > 1) return words.map((word) => word[0]).join("").slice(0, 3);
  return (words[0] ?? "ST").slice(0, 2);
}

function cityCode(city: string) {
  return (city.toUpperCase().match(/[A-Z0-9]/g) ?? []).slice(0, 3).join("");
}

/** Reads the shared store fields from the form. */
function readStoreForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
    country: String(formData.get("country") ?? ""),
    state: String(formData.get("state") ?? ""),
    city: String(formData.get("city") ?? ""),
    pincode: String(formData.get("pincode") ?? ""),
    employeeIds: formData.getAll("employeeIds").map(String),
  };
}

/** True when every id is an employee of this admin. */
async function ownsEmployees(adminId: string, employeeIds: string[]) {
  if (employeeIds.length === 0) return true;
  const count = await prisma.employee.count({ where: { adminId, id: { in: employeeIds } } });
  return count === employeeIds.length;
}

const EMPLOYEES_GONE = "One or more selected employees are no longer available. Refresh and try again.";

/* ─────────────────────────────── Create ─────────────────────────────── */

/** Create a store for the authenticated admin; ownership never comes from form input. */
export async function createStoreAction(formData: FormData): Promise<CreateStoreResult> {
  const admin = await requireAdmin();
  const parsed = CreateStoreSchema.safeParse(readStoreForm(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const { employeeIds, ...fields } = parsed.data;

  try {
    if (!(await ownsEmployees(admin.id, employeeIds))) {
      return { ok: false, errors: { employeeIds: [EMPLOYEES_GONE] } };
    }

    const store = await prisma.$transaction(async (tx) => {
      // Updating the admin row serializes simultaneous creates for this account.
      const { storeCodeCounter } = await tx.admin.update({
        where: { id: admin.id },
        data: { storeCodeCounter: { increment: 1 } },
        select: { storeCodeCounter: true },
      });
      const city = cityCode(fields.city) || "CTY";
      const code = `${storeInitials(fields.name)}-${city}-${String(storeCodeCounter).padStart(3, "0")}`;
      return tx.store.create({
        data: {
          ...fields,
          code,
          adminId: admin.id,
          employees: { create: employeeIds.map((employeeId) => ({ employeeId })) },
        },
        select: { id: true, name: true, code: true },
      });
    });

    refresh();
    return { ok: true, store };
  } catch (error) {
    console.error("[store:create] failed", error);
    return { ok: false, message: "We couldn't create the store. Please try again." };
  }
}

/* ─────────────────────────────── Update ─────────────────────────────── */

/** Updates a store's details and replaces its employee list. The store code stays the same. */
export async function updateStoreAction(formData: FormData): Promise<UpdateStoreResult> {
  const admin = await requireAdmin();
  const parsed = UpdateStoreSchema.safeParse({ ...readStoreForm(formData), storeId: String(formData.get("storeId") ?? "") });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const { storeId, employeeIds, ...fields } = parsed.data;

  try {
    const existing = await prisma.store.findFirst({ where: { id: storeId, adminId: admin.id }, select: { id: true } });
    if (!existing) return { ok: false, message: "This store no longer exists. Refresh the page." };

    if (!(await ownsEmployees(admin.id, employeeIds))) {
      return { ok: false, errors: { employeeIds: [EMPLOYEES_GONE] } };
    }

    const store = await prisma.$transaction(async (tx) => {
      await tx.employeeStore.deleteMany({ where: { storeId, employeeId: { notIn: employeeIds } } });
      await tx.employeeStore.createMany({
        data: employeeIds.map((employeeId) => ({ employeeId, storeId })),
        skipDuplicates: true, // employees who stay keep their original assignedAt
      });
      return tx.store.update({
        where: { id: storeId },
        data: fields,
        select: { id: true, name: true, code: true },
      });
    });

    refresh();
    return { ok: true, store };
  } catch (error) {
    console.error("[store:update] failed", error);
    return { ok: false, message: "We couldn't save the changes. Please try again." };
  }
}

/* ─────────────────────────────── Delete ─────────────────────────────── */

export type DeleteStoreResult = { ok: true } | { ok: false; message: string };

/** Permanently deletes one of the admin's stores. Employees stay; only their link to this store is removed. */
export async function deleteStoreAction(storeId: string): Promise<DeleteStoreResult> {
  const admin = await requireAdmin();
  if (typeof storeId !== "string" || !storeId) return { ok: false, message: "Store not found." };

  try {
    // Scoped by adminId, so another admin's store can never be deleted.
    const { count } = await prisma.store.deleteMany({ where: { id: storeId, adminId: admin.id } });
    if (count === 0) return { ok: false, message: "This store no longer exists." };
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("[store:delete] failed", error);
    return { ok: false, message: "We couldn't delete the store. Please try again." };
  }
}
