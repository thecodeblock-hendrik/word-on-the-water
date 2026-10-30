import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import path from "node:path";

import { securityHeaders } from "./src/lib/security-headers";

// The API and web share one .env at the repository root (created by `make setup`).
loadEnvConfig(path.resolve(__dirname, "../.."));

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
