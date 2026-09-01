/**
 * @file next.config.ts
 * @description Next.js configuration for the web app.
 * @architecture Allows remote images from Google avatar storage and proxies
 *   raw backend routes to the Fastify API server via rewrites so the frontend
 *   never exposes the backend origin to the browser.
 */

import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:8080";

/**
 * @constant {NextConfig} nextConfig
 * @description Next.js build-time configuration object.
 */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  /**
   * Proxy backend routes to the Fastify API server.
   *
   * - beforeFiles: run BEFORE Next.js filesystem routes.
   *   The Next.js Route Handlers at /api/v1/* shadow these rewrites, so
   *   only paths with no matching Route Handler fall through to the backend
   *   (e.g. /health, /api/protected, any future raw Fastify routes).
   *
   * - afterFiles: run AFTER filesystem routes fail.
   *   /api/* catch-all ensures any unmatched /api path is still forwarded.
   */
  async rewrites() {
    return {
      beforeFiles: [
        // Health / liveness probe — surfaced directly from Fastify
        {
          source: "/health",
          destination: `${API_URL}/health`,
        },
      ],
      afterFiles: [
        // Forward any /api/* path that didn't match a Next.js Route Handler
        {
          source: "/api/:path*",
          destination: `${API_URL}/api/:path*`,
        },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;

