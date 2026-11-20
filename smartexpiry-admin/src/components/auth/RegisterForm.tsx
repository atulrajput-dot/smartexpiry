"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Lock, Mail, Phone, User } from "lucide-react";
import { registerAction } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ROUTES } from "@/lib/auth/constants";

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);
  const errors = state?.errors;
  const values = state?.values;

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.message && <Alert variant="error">{state.message}</Alert>}

      <Input
        name="name"
        label="Full name"
        placeholder="Jane Doe"
        autoComplete="name"
        leftIcon={<User />}
        defaultValue={values?.name}
        error={errors?.name}
        required
        autoFocus
      />

      <Input
        name="email"
        type="email"
        label="Email"
        placeholder="you@company.com"
        autoComplete="email"
        leftIcon={<Mail />}
        defaultValue={values?.email}
        error={errors?.email}
        hint="We'll send a verification link to this address."
        required
      />

      <Input
        name="phone"
        type="tel"
        label="Contact number"
        placeholder="+91 98765 43210"
        autoComplete="tel"
        inputMode="tel"
        leftIcon={<Phone />}
        defaultValue={values?.phone}
        error={errors?.phone}
        required
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          name="password"
          type="password"
          label="Password"
          placeholder="Create a password"
          autoComplete="new-password"
          leftIcon={<Lock />}
          error={errors?.password}
          required
        />
        <Input
          name="confirmPassword"
          type="password"
          label="Confirm password"
          placeholder="Repeat password"
          autoComplete="new-password"
          leftIcon={<Lock />}
          error={errors?.confirmPassword}
          required
        />
      </div>
      {!errors?.password && (
        <p className="-mt-2 text-xs text-muted-foreground">
          8+ characters with a letter, a number and a special character.
        </p>
      )}

      <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Creating account…">
        Create account
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={ROUTES.login} className="font-medium text-primary hover:underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
