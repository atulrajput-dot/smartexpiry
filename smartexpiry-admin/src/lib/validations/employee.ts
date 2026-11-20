import * as z from "zod";

export const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024; // keep below next.config bodySizeLimit
export const PROFILE_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const CreateEmployeeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Name must be at least 2 characters." })
    .max(80, { error: "Name must be 80 characters or fewer." }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Enter a valid email address." })),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s\-()]/g, ""))
    .pipe(z.string().regex(/^\+?[0-9]{10,15}$/, { error: "Enter a valid phone number (10–15 digits)." })),
  password: z
    .string()
    .min(8, { error: "At least 8 characters." })
    .max(72, { error: "At most 72 characters." })
    .regex(/[a-zA-Z]/, { error: "At least one letter." })
    .regex(/[0-9]/, { error: "At least one number." })
    .regex(/[^a-zA-Z0-9]/, { error: "At least one special character." }),
  designation: z
    .string()
    .trim()
    .min(2, { error: "Designation is required." })
    .max(80, { error: "Designation must be 80 characters or fewer." }),
  storeIds: z
    .array(z.string().min(1))
    .min(1, { error: "Assign at least one store." })
    .max(100)
    .transform((ids) => [...new Set(ids)]),
});

/** Edit: same rules, but the password is optional (blank = keep current) and status is editable. */
export const UpdateEmployeeSchema = CreateEmployeeSchema.extend({
  employeeId: z.string().min(1, { error: "Employee not found." }),
  // Blank keeps the current password; anything else must meet the normal rules (with their messages).
  password: z.string().superRefine((value, ctx) => {
    if (!value) return;
    const result = CreateEmployeeSchema.shape.password.safeParse(value);
    if (!result.success) {
      for (const issue of result.error.issues) ctx.addIssue({ code: "custom", message: issue.message });
    }
  }),
  status: z.enum(["ACTIVE", "INACTIVE"], { error: "Choose a status." }),
  removeImage: z.boolean(),
});

export type CreateEmployeeField = keyof z.input<typeof CreateEmployeeSchema> | "profileImage";
export type EmployeeFormField = CreateEmployeeField | "status";

export type CreateEmployeeResult =
  | { ok: true; employee: { id: string; name: string; employeeCode: string } }
  | { ok: false; message?: string; errors?: Partial<Record<EmployeeFormField, string[]>> };

export type UpdateEmployeeResult = CreateEmployeeResult;
