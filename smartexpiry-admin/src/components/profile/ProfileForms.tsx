"use client";

import { useActionState, useState, type ReactNode } from "react";
import { KeyRound, Lock, Mail, Phone, Save, User, UserRound } from "lucide-react";
import { changePasswordAction, updateProfileAction } from "@/app/(dashboard)/profile/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

function CardHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</span>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

/** Edit name + contact number. Email is shown read-only (it's the login). */
export function ProfileDetailsForm({ name, email, phone }: { name: string; email: string; phone: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, undefined);
  const values = state?.values ?? { name, phone };

  return (
    <Card className="space-y-5">
      <CardHeader icon={<UserRound className="size-5" aria-hidden />} title="Personal information" subtitle="How you appear across SmartExpiry." />
      <form action={action} className="space-y-4" noValidate>
        {state?.message && <Alert variant={state.status === "success" ? "success" : "error"}>{state.message}</Alert>}
        <Input name="name" label="Full name" leftIcon={<User />} defaultValue={values.name} error={state?.errors?.name} autoComplete="name" required />
        <Input
          name="email"
          type="email"
          label="Email"
          leftIcon={<Mail />}
          defaultValue={email}
          readOnly
          disabled
          hint="Your email is your login and can't be changed here."
        />
        <Input name="phone" type="tel" label="Contact number" leftIcon={<Phone />} defaultValue={values.phone} error={state?.errors?.phone} autoComplete="tel" inputMode="tel" required />
        <div className="flex justify-end">
          <Button type="submit" loading={pending} loadingText="Saving…" leftIcon={<Save className="size-4" />}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Change password (current password required). Clears itself after success. */
export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  const [formKey, setFormKey] = useState(0);
  const [seen, setSeen] = useState(state);
  // After a successful change, remount the form so the password fields are empty.
  if (state !== seen) {
    setSeen(state);
    if (state?.status === "success") setFormKey((k) => k + 1);
  }

  return (
    <Card className="space-y-5">
      <CardHeader icon={<KeyRound className="size-5" aria-hidden />} title="Change password" subtitle="Use a strong password you don't use anywhere else." />
      {state?.message && <Alert variant={state.status === "success" ? "success" : "error"}>{state.message}</Alert>}
      <form key={formKey} action={action} className="space-y-4" noValidate>
        <Input name="currentPassword" type="password" label="Current password" leftIcon={<Lock />} autoComplete="current-password" error={state?.errors?.currentPassword} required />
        <Input name="newPassword" type="password" label="New password" leftIcon={<Lock />} autoComplete="new-password" error={state?.errors?.newPassword} hint="8+ characters with a letter, a number and a special character." required />
        <Input name="confirmPassword" type="password" label="Confirm new password" leftIcon={<Lock />} autoComplete="new-password" error={state?.errors?.confirmPassword} required />
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" loading={pending} loadingText="Updating…" leftIcon={<KeyRound className="size-4" />}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}
