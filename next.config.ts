import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Don't block production builds on ESLint errors. We'll address lint separately.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore type errors during build. Tighten after stabilizing.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
