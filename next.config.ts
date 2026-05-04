import type { NextConfig } from "next";

// Use Railway backend URL from env var, fallback to localhost for local dev
let BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").trim();
if (!BACKEND_URL.startsWith("http://") && !BACKEND_URL.startsWith("https://")) {
  BACKEND_URL = `https://${BACKEND_URL}`;
}
if (BACKEND_URL.endsWith("/")) {
  BACKEND_URL = BACKEND_URL.slice(0, -1);
}

const nextConfig: NextConfig = {
  // Prevent 308 redirects on trailing slashes which strip Authorization headers
  skipTrailingSlashRedirect: true,

  async rewrites() {
    return [
      {
        // Proxy /api/* → Railway backend (works both locally and on Vercel)
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          {
            key: "Access-Control-Allow-Headers",
            value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
