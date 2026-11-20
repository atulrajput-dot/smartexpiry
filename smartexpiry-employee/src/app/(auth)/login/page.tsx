import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHeading, FormSkeleton } from "@/components/auth/AuthHeading";
import { LoginForm } from "@/components/auth/LoginForm";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <AuthHeading title="Employee sign in" subtitle="Use the email and password your admin gave you." />
      {/* LoginForm reads the URL (?next, ?reason), so it streams in behind Suspense. */}
      <Suspense fallback={<FormSkeleton fields={2} />}>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Business owner or manager?{" "}
        <a href={`${SITE_URL}/login`} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
          Sign in as admin
        </a>
      </p>
      <p className="mt-2 text-center text-sm">
        <a href={SITE_URL} className="text-muted-foreground hover:text-foreground hover:underline">
          ← Back to SmartExpiry home
        </a>
      </p>
    </>
  );
}
