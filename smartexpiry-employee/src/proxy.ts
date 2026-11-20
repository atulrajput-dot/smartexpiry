import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, GUEST_ONLY_PREFIXES, PUBLIC_PREFIXES, REFRESH_COOKIE, ROUTES } from "@/lib/auth/constants";
import { clearAuthCookies, writeAuthCookies } from "@/lib/auth/cookies";
import { rotateSession, type RefreshedTokens } from "@/lib/auth/session";
import { verifyAccessToken } from "@/lib/auth/tokens";

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Runs before every page request (navigations, RSC fetches, prefetches and
 * Server Action POSTs alike).
 *
 * 1. Valid access token → continue.
 * 2. Access token missing/expired but a refresh token is present → renew the
 *    tokens right here and continue with the new access token. No redirect, so
 *    this works the same for page loads, client navigations and form saves.
 * 3. Still no session on a protected page → login.
 *
 * Every page except PUBLIC_PREFIXES is protected. Real authorization still
 * happens in the Data Access Layer (lib/auth/dal.ts).
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  let signedIn = !!(accessToken && (await verifyAccessToken(accessToken)));
  let renewed: RefreshedTokens | null = null;
  let refreshFailed = false;

  if (!signedIn && refreshToken) {
    try {
      renewed = await rotateSession(refreshToken);
    } catch (error) {
      console.error("[proxy] session refresh failed", error);
    }
    signedIn = !!renewed;
    refreshFailed = !renewed;
  }

  /** Adds the renewed cookies (or clears dead ones) to whatever we return. */
  const finish = (response: NextResponse) => {
    if (renewed) writeAuthCookies(response.cookies, renewed);
    else if (refreshFailed) clearAuthCookies(response.cookies);
    return response;
  };

  if (pathname === "/") {
    return finish(NextResponse.redirect(new URL(signedIn ? ROUTES.home : ROUTES.login, request.url)));
  }

  const isPublic = matches(pathname, PUBLIC_PREFIXES);

  if (!isPublic && !signedIn) {
    const login = new URL(ROUTES.login, request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    if (refreshFailed) login.searchParams.set("reason", "expired");
    return finish(NextResponse.redirect(login));
  }

  if (matches(pathname, GUEST_ONLY_PREFIXES) && signedIn) {
    return finish(NextResponse.redirect(new URL(ROUTES.home, request.url)));
  }

  if (renewed) {
    // Hand the new access token to this same request, so the page renders signed in.
    request.cookies.set(ACCESS_COOKIE, renewed.accessToken);
    if (renewed.refreshToken) request.cookies.set(REFRESH_COOKIE, renewed.refreshToken);
    return finish(NextResponse.next({ request: { headers: new Headers(request.headers) } }));
  }

  return finish(NextResponse.next());
}

export const config = {
  // Skip API routes, Next internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
