/**
 * Public address of the SmartExpiry website (landing page, served by the Admin app).
 * Read at build time, so set it before `npm run build`.
 */
export const SITE_URL = (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
