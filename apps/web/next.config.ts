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
  images: {
    formats: ["image/avif", "image/webp"],
    // Content images are served by src/app/content; the writer's photo lives in public/. No query strings.
    localPatterns: [
      { pathname: "/content/**", search: "" },
      { pathname: "/henno-surfing.jpg", search: "" },
    ],
  },
  // The loader reads content/ with paths built at run time, so say which routes need it.
  outputFileTracingIncludes: {
    "/": ["./content/**/*"],
    "/devotionals/*": ["./content/**/*"],
    "/content/**": ["./content/**/*"],
  },
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
