"use client";

import { useActionState, useEffect, useRef } from "react";
import { KeyRound, Lock } from "lucide-react";
import { changePasswordAction } from "@/app/(app)/profile/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      {state?.status === "success" && <Alert variant="success">{state.message}</Alert>}
      {state?.status === "error" && state.message && <Alert variant="error">{state.message}</Alert>}
      <Input name="currentPassword" type="password" label="Current password" autoComplete="current-password" leftIcon={<Lock />} error={state?.errors?.currentPassword} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="newPassword"
          type="password"
          label="New password"
          autoComplete="new-password"
          leftIcon={<Lock />}
          error={state?.errors?.newPassword}
          hint="8+ characters with a letter, a number and a symbol."
          required
        />
        <Input name="confirmPassword" type="password" label="Confirm new password" autoComplete="new-password" leftIcon={<Lock />} error={state?.errors?.confirmPassword} required />
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={pending} loadingText="Saving…" leftIcon={<KeyRound className="size-4" />}>
          Change password
        </Button>
      </div>
    </form>
  );
}
