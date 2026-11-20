"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Info, Lock, Mail } from "lucide-react";
import { loginAction } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const reason = searchParams.get("reason");
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />

      {reason === "expired" && !state && <Alert variant="info">Your session has ended. Please sign in again.</Alert>}
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

      <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Signing in…" rightIcon={<ArrowRight className="size-4" />}>
        Sign in
      </Button>

      <p className="flex items-start gap-2 rounded-xl bg-muted/70 px-3.5 py-3 text-xs text-muted-foreground">
        <Info className="mt-px size-4 shrink-0" aria-hidden />
        <span>
          There&apos;s no sign-up here. Your admin creates your account in SmartExpiry Admin. Ask them if you don&apos;t have a
          login or forgot your password.
        </span>
      </p>
    </form>
  );
}
