import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading title="Forgot your password?" subtitle="Enter your admin email and we'll send you a 6-digit code to set a new one." />
      <ForgotPasswordForm />
    </>
  );
}
