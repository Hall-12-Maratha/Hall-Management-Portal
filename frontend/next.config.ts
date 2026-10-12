import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // postgres.js and nodemailer are Node-only; keep them out of the bundler.
  serverExternalPackages: ["postgres", "nodemailer"],
};

export default nextConfig;
