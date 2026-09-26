import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // Report images go up one per request (≤ 2 MB each); the default action limit is 1 MB.
    // Keep well under Vercel's 4.5 MB request body cap.
    serverActions: { bodySizeLimit: '3mb' },
  },
};

export default nextConfig;
