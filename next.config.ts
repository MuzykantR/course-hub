import type { NextConfig } from 'next';

// Baseline headers for every response. `frame-ancestors 'none'` (plus X-Frame-Options for old
// browsers) stops clickjacking of admin buttons from a hostile page. A full script CSP is not
// set: Next's inline bootstrap scripts and Pyodide's wasm would need nonces/'wasm-unsafe-eval'.
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // Report images go up one per request (≤ 2 MB each); the default action limit is 1 MB.
    // Keep well under Vercel's 4.5 MB request body cap.
    serverActions: { bodySizeLimit: '3mb' },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
