import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/lib/auth/constants";
import { clearAuthCookies } from "@/lib/auth/cookies";

/**
 * GET /api/auth/session-expired
 * Clears auth cookies and redirects to login. Used when the access token is
 * still valid but the session was revoked (logout elsewhere, account changes),
 * which would otherwise bounce between /login and /home.
 */
export async function GET(request: NextRequest) {
  const login = new URL(ROUTES.login, request.url);
  login.searchParams.set("reason", "expired");
  const response = NextResponse.redirect(login);
  clearAuthCookies(response.cookies);
  return response;
}
