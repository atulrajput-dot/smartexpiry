import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth/dal";

/**
 * GET /api/employees/:id/avatar
 * Serves an employee's profile photo — only to the admin who owns the employee.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/employees/[id]/avatar">) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response(null, { status: 401 });

  const { id } = await ctx.params;
  const employee = await prisma.employee.findFirst({
    where: { id, adminId: admin.id },
    select: { profileImage: true, profileImageType: true },
  });
  if (!employee?.profileImage || !employee.profileImageType) return new Response(null, { status: 404 });

  return new Response(employee.profileImage, {
    headers: {
      "Content-Type": employee.profileImageType,
      // Never serve from the browser cache without asking the server, so the
      // photo isn't viewable after logout on a shared computer.
      "Cache-Control": "private, no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
