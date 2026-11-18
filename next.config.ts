import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep visited screens in the client router cache for 30s, so hopping back
    // to a tab you just saw is instant. Anything you change still shows at once:
    // every action refreshes the router, which clears this cache.
    staleTimes: { dynamic: 30, static: 300 },
  },
};

export default nextConfig;
