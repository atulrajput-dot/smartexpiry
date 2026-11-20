import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { CalendarDays, Clock, Mail, Phone, ShieldCheck } from "lucide-react";
import { ChangePasswordForm, ProfileDetailsForm } from "@/components/profile/ProfileForms";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Profile" };

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const admin = await requireAdmin();
  const initials = admin.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account details and password.</p>
      </div>

      {/* Account summary */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div aria-hidden className="h-12 bg-linear-to-r from-brand-from to-brand-to" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="flex items-end gap-4">
            <span className="-mt-8 flex size-16 shrink-0 items-center justify-center rounded-2xl border-4 border-card bg-linear-to-br from-brand-from to-brand-to text-xl font-semibold text-white shadow-sm">
              {initials}
            </span>
            <div className="min-w-0 pb-0.5">
              <h2 className="truncate text-xl font-semibold">{admin.name}</h2>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5" aria-hidden />
                <span className="truncate">{admin.email}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                  <ShieldCheck className="size-3" aria-hidden /> Verified
                </span>
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 sm:text-right">
            <Meta icon={<Phone className="size-3.5" aria-hidden />} label="Contact" value={admin.phone} />
            <Meta icon={<CalendarDays className="size-3.5" aria-hidden />} label="Member since" value={dateFormat.format(admin.createdAt)} />
            <Meta icon={<Clock className="size-3.5" aria-hidden />} label="Last sign-in" value={admin.lastLoginAt ? dateTimeFormat.format(admin.lastLoginAt) : "—"} />
          </dl>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileDetailsForm name={admin.name} email={admin.email} phone={admin.phone} />
        <ChangePasswordForm />
      </div>
    </div>
  );
}

function Meta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-muted-foreground sm:justify-end">
        {icon}
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="h-9 w-40 rounded-lg bg-muted" />
      <div className="h-36 rounded-2xl bg-muted" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-96 rounded-2xl bg-muted" />
        <div className="h-96 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
