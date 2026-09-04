import type { NextConfig } from "next";

// Hosts the dev server may be reached through besides localhost (e.g. a port
// forward for remote demos). Server Actions check Origin against Host, so the
// forwarded host must be listed or sign-in fails with "Invalid Server Actions request".
const extraDevHosts = (process.env.DEV_PUBLIC_HOSTS ?? "182.93.95.140:83")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: extraDevHosts.map((h) => h.replace(/:\d+$/, "")),
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", ...extraDevHosts],
    },
  },
};

export default nextConfig;
