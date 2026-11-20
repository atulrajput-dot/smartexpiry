import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <AuthHeading
        title="Create your admin account"
        subtitle="Set up SmartExpiry for your store in under a minute."
      />
      <RegisterForm />
    </>
  );
}
