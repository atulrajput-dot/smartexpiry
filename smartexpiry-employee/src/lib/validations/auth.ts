import * as z from "zod";

export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Enter a valid email address." })),
  password: z.string().min(1, { error: "Enter your password." }),
});

export type LoginField = "email" | "password";

/** Shape returned by auth Server Actions to `useActionState`. */
export type FormState<F extends string> =
  | {
      status: "error" | "success";
      message?: string;
      errors?: Partial<Record<F, string[]>>;
      /** Echo of non-secret inputs so the form keeps them after an error. */
      values?: Partial<Record<F, string>>;
    }
  | undefined;

/** Same password rules as the Admin app uses when creating employees. */
const newPassword = z
  .string()
  .min(8, { error: "At least 8 characters." })
  .max(72, { error: "At most 72 characters." })
  .regex(/[a-zA-Z]/, { error: "At least one letter." })
  .regex(/[0-9]/, { error: "At least one number." })
  .regex(/[^a-zA-Z0-9]/, { error: "At least one special character." });

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Enter your current password." }),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { error: "Passwords do not match.", path: ["confirmPassword"] });

export type PasswordField = "currentPassword" | "newPassword" | "confirmPassword";
