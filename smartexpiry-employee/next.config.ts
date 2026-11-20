import type { NextConfig } from "next";

/** Sent with every page: block framing (clickjacking), MIME sniffing, and unneeded browser features. */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera is needed for barcode scanning; nothing else.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  // Browsers remember to use HTTPS only (ignored over plain HTTP, so safe in development).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Hosts (besides localhost) allowed to load dev assets, e.g. opening the app
  // from another device via your LAN IP. Without this the page loads but
  // JavaScript is blocked, so buttons like the theme switch do nothing.
  allowedDevOrigins: ["192.168.1.125"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
