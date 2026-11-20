/**
 * Public addresses of the two SmartExpiry apps.
 * Read at build time for static pages (the landing page), so set them before `npm run build`.
 */
const trim = (url: string) => url.replace(/\/+$/, "");

/** Where store staff sign in (the SmartExpiry Employee app). */
export const EMPLOYEE_APP_URL = trim(process.env.EMPLOYEE_APP_URL || "http://localhost:3001");
export const EMPLOYEE_LOGIN_URL = `${EMPLOYEE_APP_URL}/login`;
