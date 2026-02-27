import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Webhook handlers don't need frontend optimization
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
};

export default nextConfig;
