"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { forgotPasswordAction } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ROUTES } from "@/lib/auth/constants";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
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
      <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Sending code…" rightIcon={<Send className="size-4" />}>
        Send reset code
      </Button>
      <Link href={ROUTES.login} className="flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Back to sign in
      </Link>
    </form>
  );
}
