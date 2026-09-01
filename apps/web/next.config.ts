/**
 * @file next.config.ts
 * @description Next.js configuration for the web app.
 * @architecture Allows remote images from Google avatar storage.
 */

import type { NextConfig } from "next";

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
};

export default nextConfig;
