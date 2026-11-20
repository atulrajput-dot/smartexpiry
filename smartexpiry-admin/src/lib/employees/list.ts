import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

export type EmployeeListQuery = {
  q: string;
  storeId: string;
  status: "ACTIVE" | "INACTIVE" | "";
  page: number;
  pageSize: number;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Turns untrusted URL search params into a safe, normalized query. */
export function parseEmployeeQuery(params: RawSearchParams): EmployeeListQuery {
  const status = first(params.status).toUpperCase();
  const page = Number.parseInt(first(params.page), 10);
  const pageSize = Number.parseInt(first(params.pageSize), 10);
  return {
    q: first(params.q).trim().slice(0, 100),
    storeId: first(params.store).slice(0, 50),
    status: status === "ACTIVE" || status === "INACTIVE" ? status : "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
  };
}

export type EmployeeRow = {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
  phone: string;
  designation: string;
  status: "ACTIVE" | "INACTIVE";
  avatarUrl: string | null;
  hasViewablePassword: boolean;
  /** Formatted on the server ("17 Nov 2026") so server and browser render the same text. */
  createdAt: string;
  stores: { id: string; name: string; code: string }[];
};

export type EmployeeListResult = {
  rows: EmployeeRow[];
  total: number;
  /** Employees for this admin with no filters applied (to tell "none yet" from "no matches"). */
  totalUnfiltered: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** One page of the admin's employees, filtered and searched in the database. */
export async function listEmployees(adminId: string, query: EmployeeListQuery): Promise<EmployeeListResult> {
  const { q, storeId, status, pageSize } = query;
  const digits = q.replace(/[\s\-()+]/g, "");

  const where: Prisma.EmployeeWhereInput = {
    adminId,
    ...(status ? { status } : {}),
    ...(storeId ? { stores: { some: { storeId } } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { employeeCode: { contains: q, mode: "insensitive" } },
            { designation: { contains: q, mode: "insensitive" } },
            ...(digits.length >= 3 && /^\d+$/.test(digits) ? [{ phone: { contains: digits } }] : []),
          ],
        }
      : {}),
  };

  const [total, totalUnfiltered] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.count({ where: { adminId } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(query.page, totalPages); // e.g. ?page=99 → last page

  const employees = await prisma.employee.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      name: true,
      employeeCode: true,
      email: true,
      phone: true,
      designation: true,
      status: true,
      profileImageType: true,
      passwordEncrypted: true,
      createdAt: true,
      updatedAt: true,
      stores: {
        orderBy: { assignedAt: "asc" },
        select: { store: { select: { id: true, name: true, code: true } } },
      },
    },
  });

  return {
    rows: employees.map((e) => ({
      id: e.id,
      name: e.name,
      employeeCode: e.employeeCode,
      email: e.email,
      phone: e.phone,
      designation: e.designation,
      status: e.status,
      avatarUrl: e.profileImageType ? `/api/employees/${e.id}/avatar?v=${e.updatedAt.getTime()}` : null,
      hasViewablePassword: !!e.passwordEncrypted, // the value itself is fetched on demand
      createdAt: dateFormat.format(e.createdAt),
      stores: e.stores.map((s) => s.store),
    })),
    total,
    totalUnfiltered,
    page,
    pageSize,
    totalPages,
  };
}
