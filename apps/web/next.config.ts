import path from 'node:path';
import type { NextConfig } from 'next';

const monorepoRoot = path.join(import.meta.dirname, '../..');

// Rewrites are serialized into the standalone server at build time, so changing
// API_URL means rebuilding the image (it's a Docker build arg for that reason).
const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: monorepoRoot,
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async redirects() {
    return [{ source: '/', destination: '/dashboard', permanent: false }];
  },
  // The browser only ever talks to this origin. Proxying /api/* to Express keeps the
  // auth cookies first-party and removes CORS from the browser's path entirely.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
