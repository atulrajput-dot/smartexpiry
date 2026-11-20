import * as z from "zod";
import { RegisterSchema } from "@/lib/validations/auth";

// Reuse the exact registration rules so profile edits can't bypass them.
const registerShape = RegisterSchema.shape;

export const UpdateProfileSchema = z.object({
  name: registerShape.name,
  phone: registerShape.phone,
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Enter your current password." }),
    newPassword: registerShape.password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { error: "Passwords do not match.", path: ["confirmPassword"] });

export type ProfileField = "name" | "phone";
export type PasswordField = "currentPassword" | "newPassword" | "confirmPassword";
