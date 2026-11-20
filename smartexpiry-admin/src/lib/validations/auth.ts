import * as z from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }));

export const RegisterSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { error: "Name must be at least 2 characters." })
      .max(80, { error: "Name must be 80 characters or fewer." }),
    email,
    // Accepts "+91 98765-43210" style input; stored as digits with optional leading +.
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s\-()]/g, ""))
      .pipe(
        z.string().regex(/^\+?[0-9]{10,15}$/, {
          error: "Enter a valid contact number (10–15 digits, optional +country code).",
        }),
      ),
    password: z
      .string()
      .min(8, { error: "At least 8 characters." })
      .max(72, { error: "At most 72 characters." })
      .regex(/[a-zA-Z]/, { error: "At least one letter." })
      .regex(/[0-9]/, { error: "At least one number." })
      .regex(/[^a-zA-Z0-9]/, { error: "At least one special character." }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const LoginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Enter your password." }),
});

export const ResendVerificationSchema = z.object({ email });

export const ForgotPasswordSchema = z.object({ email });

export const ResetPasswordSchema = z
  .object({
    email,
    otp: z
      .string()
      .trim()
      .regex(/^[0-9]{6}$/, { error: "Enter the 6-digit code from your email." }),
    password: RegisterSchema.shape.password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { error: "Passwords do not match.", path: ["confirmPassword"] });

export type ResetField = "otp" | "password" | "confirmPassword";

export const VerifyOtpSchema = z.object({
  email,
  otp: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, { error: "Enter the 6-digit code from your email." }),
});

export type RegisterField = "name" | "email" | "phone" | "password" | "confirmPassword";
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
