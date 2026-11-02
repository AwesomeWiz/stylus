import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  reactStrictMode: true,
  typedRoutes: true,
  // One file per action, retaining the existing 10 MB private image policy.
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
};

export default nextConfig;
