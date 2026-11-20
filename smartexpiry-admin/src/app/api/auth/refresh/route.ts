import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_COOKIE, ROUTES } from "@/lib/auth/constants";
import { clearAuthCookies, clearLegacyRefreshCookie, writeAuthCookies } from "@/lib/auth/cookies";
import { rotateSession } from "@/lib/auth/session";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : ROUTES.home;
}

async function refresh(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  try {
    return await rotateSession(refreshToken);
  } catch (error) {
    console.error("[refresh] failed", error);
    return null;
  }
}

/**
 * GET /api/auth/refresh?next=/dashboard
 * Renews the tokens and sends the admin back to the page, or to login.
 * (The proxy now renews expired access tokens itself; this stays for links/bookmarks.)
 */
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const tokens = await refresh(request);

  if (!tokens) {
    const login = new URL(ROUTES.login, request.url);
    login.searchParams.set("next", next);
    const response = NextResponse.redirect(login);
    clearAuthCookies(response.cookies);
    clearLegacyRefreshCookie(response.cookies);
    return response;
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  writeAuthCookies(response.cookies, tokens);
  clearLegacyRefreshCookie(response.cookies);
  return response;
}

/**
 * POST /api/auth/refresh
 * For client-side fetch calls: returns 200 with fresh cookies, or 401.
 */
export async function POST(request: NextRequest) {
  const tokens = await refresh(request);
  if (!tokens) {
    const response = NextResponse.json({ ok: false }, { status: 401 });
    clearAuthCookies(response.cookies);
    return response;
  }
  const response = NextResponse.json({ ok: true });
  writeAuthCookies(response.cookies, tokens);
  return response;
}
