/** Cookie names and route lists shared by proxy, route handlers and actions. */

// Different names from the Admin app: browsers share cookies between
// localhost:3000 and localhost:3001, so equal names would overwrite each other.
export const ACCESS_COOKIE = "se_emp_access_token";
export const REFRESH_COOKIE = "se_emp_refresh_token";

export const ROUTES = {
  login: "/login",
  home: "/home",
  refresh: "/api/auth/refresh",
  sessionExpired: "/api/auth/session-expired",
} as const;

/**
 * Pages anyone can open. EVERY other page (matched by the proxy) requires a
 * signed-in employee, so new pages are protected automatically.
 * There is no sign-up: the admin creates employees and shares their login.
 */
export const PUBLIC_PREFIXES = ["/login"];

/** Pages a signed-in employee should not see. */
export const GUEST_ONLY_PREFIXES = ["/login"];
