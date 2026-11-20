"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { loginAction } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ROUTES } from "@/lib/auth/constants";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const reason = searchParams.get("reason");
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />

      {searchParams.get("reset") === "1" && !state && (
        <Alert variant="success">Password changed. Sign in with your new password.</Alert>
      )}

      {reason === "expired" && !state && (
        <Alert variant="info">Your session has ended. Please sign in again.</Alert>
      )}

      {state?.message && <Alert variant="error">{state.message}</Alert>}

      <Input
        name="email"
        type="email"
        label="Email"
        placeholder="you@company.com"
        autoComplete="email"
        leftIcon={<Mail />}
        defaultValue={state?.values?.email}
        error={state?.errors?.email}
        required
        autoFocus
      />

      <Input
        name="password"
        type="password"
        label="Password"
        placeholder="Enter your password"
        autoComplete="current-password"
        leftIcon={<Lock />}
        error={state?.errors?.password}
        required
      />

      <div className="-mt-2 flex justify-end">
        <Link href={ROUTES.forgotPassword} className="text-sm font-medium text-primary hover:underline">
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={pending}
        loadingText="Signing in…"
        rightIcon={<ArrowRight className="size-4" />}
      >
        Sign in
      </Button>

      <div className="relative py-1 text-center text-xs text-muted-foreground">
        <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
        <span className="relative bg-background px-3">New to SmartExpiry?</span>
      </div>

      <Link href={ROUTES.register} className={buttonVariants({ variant: "secondary", size: "lg", fullWidth: true })}>
        Create an admin account
      </Link>
    </form>
  );
}
