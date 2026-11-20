import * as z from "zod";

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be ${max} characters or fewer.`);

export const CreateStoreSchema = z.object({
  name: requiredText("Store name", 120),
  email: z.union([z.literal(""), z.email({ error: "Enter a valid email address." })]).transform((value) => value || null),
  phone: z.string().trim().transform((value) => value.replace(/[\s\-()]/g, "")).pipe(
    z.string().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number (10–15 digits)."),
  ),
  address: requiredText("Address", 255),
  country: requiredText("Country", 100),
  state: requiredText("State", 100),
  city: requiredText("City", 100),
  pincode: z.string().trim().min(1, "Pincode is required.").max(20, "Pincode must be 20 characters or fewer.").regex(/^[a-zA-Z0-9][a-zA-Z0-9\s-]*$/, "Enter a valid pincode."),
  /** Employees who work at this store (optional; a store can have many). */
  employeeIds: z
    .array(z.string().min(1))
    .max(500)
    .transform((ids) => [...new Set(ids)]),
});

/** Edit: same fields plus the store being edited. The store code never changes. */
export const UpdateStoreSchema = CreateStoreSchema.extend({
  storeId: z.string().min(1, "Store not found."),
});

export type CreateStoreField = keyof z.input<typeof CreateStoreSchema>;
export type CreateStoreValues = z.input<typeof CreateStoreSchema>;
export type UpdateStoreResult = CreateStoreResult;
export type CreateStoreResult =
  | { ok: true; store: { id: string; name: string; code: string } }
  | { ok: false; message?: string; errors?: Partial<Record<CreateStoreField, string[]>> };
