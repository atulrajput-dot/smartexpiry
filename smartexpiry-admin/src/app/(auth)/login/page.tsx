import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHeading, FormSkeleton } from "@/components/auth/AuthHeading";
import { LoginForm } from "@/components/auth/LoginForm";
import { EMPLOYEE_LOGIN_URL } from "@/lib/site";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <AuthHeading title="Welcome back" subtitle="Sign in to manage products and expiry alerts." />
      {/* LoginForm reads the URL (?next, ?reason), so it streams in behind Suspense. */}
      <Suspense fallback={<FormSkeleton fields={2} />}>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Store staff?{" "}
        <a href={EMPLOYEE_LOGIN_URL} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Sign in to the employee app
        </a>
      </p>
    </>
  );
}
