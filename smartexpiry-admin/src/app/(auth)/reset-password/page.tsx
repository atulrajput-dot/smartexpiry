import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHeading, FormSkeleton } from "@/components/auth/AuthHeading";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeading title="Set a new password" subtitle="Enter the code from your email and choose a new password." />
      {/* Reads ?email from the URL, so it streams in behind Suspense. */}
      <Suspense fallback={<FormSkeleton fields={3} />}>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
