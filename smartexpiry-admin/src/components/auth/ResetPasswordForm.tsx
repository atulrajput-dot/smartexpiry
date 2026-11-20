"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Lock, RotateCcw } from "lucide-react";
import { resendResetCodeAction, resetPasswordAction } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput } from "@/components/ui/OtpInput";
import { ROUTES } from "@/lib/auth/constants";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  const [resend, setResend] = useState<{ ok: boolean; message: string } | null>(null);
  const [resending, startResend] = useTransition();

  if (!email) {
    return (
      <Alert variant="warning" title="Start from the beginning">
        This link is missing your email.{" "}
        <Link href={ROUTES.forgotPassword} className="font-medium underline">
          Request a reset code
        </Link>
        .
      </Alert>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="email" value={email} />
      {searchParams.get("sent") && !state && !resend && (
        <Alert variant="info">
          If <span className="font-medium">{email}</span> has an admin account, we&apos;ve emailed it a 6-digit code. Check spam if
          you don&apos;t see it.
        </Alert>
      )}
      {resend && <Alert variant={resend.ok ? "success" : "error"}>{resend.message}</Alert>}
      {state?.message && <Alert variant="error">{state.message}</Alert>}

      <OtpInput name="otp" label="Reset code" error={state?.errors?.otp} hint="The code expires 10 minutes after it was sent." />
      <Input
        name="password"
        type="password"
        label="New password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        leftIcon={<Lock />}
        error={state?.errors?.password}
        hint="Use 8+ characters with a letter, a number and a symbol."
        required
      />
      <Input
        name="confirmPassword"
        type="password"
        label="Confirm new password"
        autoComplete="new-password"
        leftIcon={<Lock />}
        error={state?.errors?.confirmPassword}
        required
      />
      <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Saving…" rightIcon={<KeyRound className="size-4" />}>
        Set new password
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href={ROUTES.login} className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Back to sign in
        </Link>
        <button
          type="button"
          disabled={resending}
          onClick={() => startResend(async () => setResend(await resendResetCodeAction(email)))}
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline disabled:opacity-60"
        >
          <RotateCcw className="size-4" aria-hidden /> {resending ? "Sending…" : "Send a new code"}
        </button>
      </div>
    </form>
  );
}
