import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ACCESS_COOKIE, ROUTES } from "@/lib/auth/constants";
import { verifyAccessToken } from "@/lib/auth/tokens";

/**
 * Data Access Layer: the single place that turns the request's access token
 * into an employee. Server Components and Server Actions must call this
 * instead of trusting the proxy alone.
 */

export type CurrentEmployee = {
  id: string;
  /** The admin (company) this employee belongs to: owns the product catalog. */
  adminId: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  lastLoginAt: Date | null;
  companyName: string;
  stores: { id: string; name: string; code: string; phone: string; address: string; city: string; state: string; pincode: string }[];
};

/** Returns the signed-in, active employee, or null. Memoised per request. */
export const getCurrentEmployee = cache(async (): Promise<CurrentEmployee | null> => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  const employee = await prisma.employee.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      adminId: true,
      employeeCode: true,
      name: true,
      email: true,
      phone: true,
      designation: true,
      status: true,
      lastLoginAt: true,
      refreshTokenHash: true,
      admin: { select: { name: true } },
      stores: {
        orderBy: { store: { name: "asc" } },
        select: { store: { select: { id: true, name: true, code: true, phone: true, address: true, city: true, state: true, pincode: true } } },
      },
    },
  });
  // Null refresh hash = logged out, password changed or deactivated by the admin.
  if (!employee || employee.status !== "ACTIVE" || !employee.refreshTokenHash) return null;

  return {
    id: employee.id,
    adminId: employee.adminId,
    employeeCode: employee.employeeCode,
    name: employee.name,
    email: employee.email,
    phone: employee.phone,
    designation: employee.designation,
    lastLoginAt: employee.lastLoginAt,
    companyName: employee.admin.name,
    stores: employee.stores.map((s) => s.store),
  };
});

/**
 * Like getCurrentEmployee, but sends signed-out visitors to login via
 * /api/auth/session-expired, which clears stale cookies first.
 */
export async function requireEmployee(): Promise<CurrentEmployee> {
  const employee = await getCurrentEmployee();
  if (!employee) redirect(ROUTES.sessionExpired);
  return employee;
}
