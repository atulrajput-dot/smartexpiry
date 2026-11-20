import type { Metadata } from "next";
import { Suspense } from "react";
import { BadgeCheck, Building2, CalendarClock, IdCard, Mail, Phone, ShieldCheck, Store } from "lucide-react";
import { ActivityList } from "@/components/activity/ActivityList";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { Card } from "@/components/ui/Card";
import type { ActivityRow } from "@/lib/activity/list";
import { requireEmployee } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "My profile" };

const dateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: process.env.APP_TIMEZONE || undefined,
});

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" aria-hidden />}>
      <ProfileContent />
    </Suspense>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

async function ProfileContent() {
  const me = await requireEmployee();
  const recent = await prisma.activityLog.findMany({
    where: { actorEmployeeId: me.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const rows: ActivityRow[] = recent.map((r) => ({
    id: r.id,
    at: r.createdAt.toISOString(),
    action: r.action,
    reason: r.reason,
    actorName: r.actorName,
    actorLabel: r.actorLabel,
    isAdmin: false,
    storeId: r.storeId,
    storeName: r.storeName,
    productName: r.productName,
    quantity: r.quantity ? r.quantity.toNumber() : null,
    unit: r.unit,
    details: r.details,
  }));

  const details = [
    { Icon: Mail, label: "Email (sign-in)", value: me.email },
    { Icon: Phone, label: "Phone", value: me.phone },
    { Icon: IdCard, label: "Employee code", value: me.employeeCode },
    { Icon: Building2, label: "Company", value: me.companyName },
    { Icon: CalendarClock, label: "Signed in", value: me.lastLoginAt ? dateTime.format(me.lastLoginAt) : "—" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My profile</h1>

      <section className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div aria-hidden className="h-16 bg-linear-to-r from-brand-from to-brand-to" />
        <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-end sm:gap-4 sm:px-6">
          <span className="-mt-9 flex size-18 shrink-0 items-center justify-center rounded-2xl border-4 border-card bg-primary text-2xl font-semibold text-primary-foreground shadow-sm">
            {initials(me.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-xl font-semibold">{me.name}</h2>
            <p className="text-sm text-muted-foreground">
              {me.designation} · <span className="font-mono">{me.employeeCode}</span>
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
            <BadgeCheck className="size-3.5" aria-hidden /> Active
          </span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-2">
          <h2 className="font-semibold">Details</h2>
          <p className="mb-4 text-sm text-muted-foreground">Ask your admin to change these.</p>
          <dl className="space-y-3 text-sm">
            {details.map(({ Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="truncate font-medium">{value}</dd>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Store className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Stores</dt>
                <dd className="font-medium">{me.stores.length ? me.stores.map((s) => s.name).join(", ") : "None assigned yet"}</dd>
              </div>
            </div>
          </dl>
        </Card>

        <Card className="min-w-0 lg:col-span-3">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <ShieldCheck className="size-4" aria-hidden />
            </span>
            <div>
              <h2 className="font-semibold">Change password</h2>
              <p className="text-sm text-muted-foreground">Your admin can still reset it for you if you forget it.</p>
            </div>
          </div>
          <ChangePasswordForm />
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">My recent activity</h2>
          <p className="text-sm text-muted-foreground">The last 10 stock changes you made. Your admin sees the full history.</p>
        </div>
        <ActivityList rows={rows} showActor={false} emptyText="You haven't changed any stock yet" />
      </Card>
    </div>
  );
}
