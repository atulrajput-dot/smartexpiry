/** Cookie names and route lists shared by proxy, route handlers and actions. */

export const ACCESS_COOKIE = "se_access_token";
export const REFRESH_COOKIE = "se_refresh_token";

/** Path the refresh cookie used before it moved to "/" (cleared on sight). */
export const LEGACY_REFRESH_COOKIE_PATH = "/api/auth";

export const ROUTES = {
  login: "/login",
  register: "/register",
  verifyEmail: "/verify-email",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  home: "/dashboard",
  refresh: "/api/auth/refresh",
  sessionExpired: "/api/auth/session-expired",
} as const;

/**
 * Pages anyone can open. EVERY other page (matched by the proxy) requires a
 * signed-in admin, so new pages are protected automatically.
 */
export const PUBLIC_PREFIXES = ["/login", "/register", "/verify-email", "/forgot-password", "/reset-password"];

/** Auth pages a signed-in admin should not see. */
export const GUEST_ONLY_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password"];

/** Minimum seconds between two verification emails for the same account. */
export const VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;
