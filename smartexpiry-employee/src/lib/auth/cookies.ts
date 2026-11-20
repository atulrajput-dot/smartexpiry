import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants";
import { accessTokenTtlSeconds, refreshTokenTtlSeconds } from "@/lib/auth/tokens";

/** Anything with a Next.js-style `cookies.set` (cookies() store or NextResponse.cookies). */
type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
};
type CookieWriter = { set(name: string, value: string, options?: CookieOptions): unknown };

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Writes the auth cookies. Both use path "/" so the proxy can renew an expired
 * access token on any request. Pass `refreshToken: null` to update only the
 * access cookie (the refresh cookie stays as it is).
 */
export function writeAuthCookies(
  store: CookieWriter,
  tokens: { accessToken: string; refreshToken: string | null },
) {
  store.set(ACCESS_COOKIE, tokens.accessToken, { ...base, maxAge: accessTokenTtlSeconds() });
  if (tokens.refreshToken) {
    store.set(REFRESH_COOKIE, tokens.refreshToken, { ...base, maxAge: refreshTokenTtlSeconds() });
  }
}

export function clearAuthCookies(store: CookieWriter) {
  store.set(ACCESS_COOKIE, "", { ...base, maxAge: 0 });
  store.set(REFRESH_COOKIE, "", { ...base, maxAge: 0 });
}
