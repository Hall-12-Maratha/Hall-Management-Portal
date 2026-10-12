import type { NextConfig } from "next";

/**
 * Security headers applied to every response. A Content-Security-Policy is
 * intentionally not set yet (Next.js inline scripts need a nonce setup).
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The worker scan page needs the camera; everything else is denied.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // postgres.js and nodemailer are Node-only; keep them out of the bundler.
  serverExternalPackages: ["postgres", "nodemailer"],
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // API responses must never be cached by intermediaries.
      { source: "/api/(.*)", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
