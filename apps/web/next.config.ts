import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import path from "node:path";

import { securityHeaders } from "./src/lib/security-headers";

// The API and web share one .env at the repository root (created by `make setup`).
// forceReload: Next has already loaded env for apps/web, and @next/env returns that cached result otherwise.
loadEnvConfig(
  path.resolve(__dirname, "../.."),
  process.env.NODE_ENV !== "production",
  console,
  true,
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
