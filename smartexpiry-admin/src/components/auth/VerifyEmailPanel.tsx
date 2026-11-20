"use client";

import { useActionState, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, MailCheck } from "lucide-react";
import { resendVerificationAction, verifyOtpAction } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput } from "@/components/ui/OtpInput";
import { ROUTES, VERIFICATION_RESEND_COOLDOWN_SECONDS } from "@/lib/auth/constants";

export function VerifyEmailPanel() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  return email ? <OtpStep email={email} /> : <EmailStep />;
}

/* ─────────────── Step shown when the page is opened without an email ─────────────── */

function EmailStep() {
  const router = useRouter();
  const [state, action, pending] = useActionState(resendVerificationAction, undefined);
  const [email, setEmail] = useState("");

  // Once a code is sent, continue to the code entry step for that email.
  useEffect(() => {
    if (state?.status === "success" && email) {
      router.replace(`${ROUTES.verifyEmail}?${new URLSearchParams({ email, sent: "1" })}`);
    }
  }, [state, email, router]);

  return (
    <div className="space-y-6">
      <Heading title="Verify your email" text="Enter the email you registered with and we'll send you a 6-digit code." />

      {state?.status === "error" && state.message && <Alert variant="error">{state.message}</Alert>}

      <form action={action} className="space-y-4" noValidate>
        <Input
          name="email"
          type="email"
          label="Email"
          placeholder="you@company.com"
          autoComplete="email"
          leftIcon={<Mail />}
          value={email}
          onChange={(e) => setEmail(e.target.value.trim())}
          error={state?.errors?.email}
          required
          autoFocus
        />
        <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Sending code…">
          Send code
        </Button>
      </form>

      <BackToLogin />
    </div>
  );
}

/* ─────────────────────────── Code entry step ─────────────────────────── */

function OtpStep({ email }: { email: string }) {
  const searchParams = useSearchParams();
  const justSent = searchParams.get("sent") === "1";
  const fromLogin = searchParams.get("from") === "login";
  const mailFailed = searchParams.get("mail") === "failed";

  const formRef = useRef<HTMLFormElement>(null);
  const [verifyState, verifyAction, verifying] = useActionState(verifyOtpAction, undefined);
  const [resendState, resendAction, resending] = useActionState(resendVerificationAction, undefined);

  const [cooldown, setCooldown] = useState(justSent ? VERIFICATION_RESEND_COOLDOWN_SECONDS : 0);
  const [otpKey, setOtpKey] = useState(0);
  const [seenVerify, setSeenVerify] = useState(verifyState);
  const [seenResend, setSeenResend] = useState(resendState);
  // Which action ran last, so only its message is shown.
  const [lastAction, setLastAction] = useState<"verify" | "resend" | null>(null);

  // React to action results during render (no extra effect pass):
  // a wrong code clears the boxes; a resend restarts the cooldown and clears too.
  if (verifyState !== seenVerify) {
    setSeenVerify(verifyState);
    setLastAction("verify");
    if (verifyState?.status === "error") setOtpKey((k) => k + 1);
  }
  if (resendState !== seenResend) {
    setSeenResend(resendState);
    setLastAction("resend");
    if (resendState?.status === "success") {
      setCooldown(VERIFICATION_RESEND_COOLDOWN_SECONDS);
      setOtpKey((k) => k + 1);
    }
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submitCode = useCallback(() => formRef.current?.requestSubmit(), []);

  const alreadyVerified = verifyState?.status === "success";
  const message =
    lastAction === "verify" ? verifyState?.message : lastAction === "resend" ? resendState?.message : undefined;
  const messageOk = (lastAction === "verify" ? verifyState : resendState)?.status === "success";

  return (
    <div className="space-y-6">
      <Heading
        title="Verify your email"
        text={
          <>
            Enter the 6-digit code we sent to <span className="font-medium text-foreground">{email}</span>.
          </>
        }
      />

      {fromLogin && !verifyState && !resendState && (
        <Alert variant="info">
          Your email isn&apos;t verified yet.{" "}
          {justSent ? "We've sent you a new code." : "Enter the code we sent you, or request a new one below."}
        </Alert>
      )}

      {mailFailed && !resendState && (
        <Alert variant="warning" title="Your account was created, but we couldn't send the code">
          Use “Resend code” below to try again.
        </Alert>
      )}

      {message && <Alert variant={messageOk ? "success" : "error"}>{message}</Alert>}

      {alreadyVerified ? (
        <Link href={ROUTES.login} className={buttonVariants({ size: "lg", fullWidth: true })}>
          Go to sign in
        </Link>
      ) : (
        <form ref={formRef} action={verifyAction} className="space-y-5" noValidate>
          <input type="hidden" name="email" value={email} />
          <OtpInput
            key={otpKey}
            name="otp"
            label="Verification code"
            error={lastAction === "verify" ? verifyState?.errors?.otp : undefined}
            hint="The code expires 10 minutes after it was sent."
            disabled={verifying}
            onComplete={submitCode}
            autoFocus
          />
          <Button type="submit" size="lg" fullWidth loading={verifying} loadingText="Verifying…">
            Verify email
          </Button>
        </form>
      )}

      {!alreadyVerified && (
        <form action={resendAction} className="flex flex-wrap items-center justify-center gap-1 text-sm">
          <input type="hidden" name="email" value={email} />
          <span className="text-muted-foreground">Didn&apos;t get the code?</span>
          <Button
            type="submit"
            variant="link"
            loading={resending}
            loadingText="Sending…"
            disabled={cooldown > 0}
            className="font-medium disabled:text-muted-foreground disabled:opacity-100"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </Button>
        </form>
      )}

      <BackToLogin />
    </div>
  );
}

/* ─────────────────────────────── Shared ─────────────────────────────── */

function Heading({ title, text }: { title: string; text: ReactNode }) {
  return (
    <div className="space-y-4">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
        <MailCheck className="size-6" aria-hidden />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function BackToLogin() {
  return (
    <Link href={ROUTES.login} className={buttonVariants({ variant: "ghost", size: "lg", fullWidth: true })}>
      Back to sign in
    </Link>
  );
}
