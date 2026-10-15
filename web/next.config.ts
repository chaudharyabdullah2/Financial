import type { NextConfig } from "next";

// The browser talks to /api/* on the Next.js origin; Next proxies it to FastAPI.
// This avoids CORS in development and lets the API move without code changes.
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
