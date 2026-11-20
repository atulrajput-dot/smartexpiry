import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/dal";
import { getDashboardSummary } from "@/lib/dashboard/summary";

/**
 * GET /api/dashboard
 * The signed-in admin's dashboard numbers as JSON (same data as the
 * dashboard page). Auth: the access-token cookie.
 */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const summary = await getDashboardSummary(admin.id);
    return NextResponse.json(summary, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[api/dashboard] failed", error);
    return NextResponse.json({ error: "Could not load the dashboard" }, { status: 500 });
  }
}
