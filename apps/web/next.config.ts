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

const devotionalFiles = [
  "./content/devotionals/**/*",
  "./content/series/**/*",
  "./content/site/**/*",
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Hostnames besides localhost that may use the dev server, e.g. a phone on the same Wi-Fi.
  allowedDevOrigins: (process.env.DEV_ORIGINS ?? "").split(",").filter(Boolean),
  images: {
    formats: ["image/avif", "image/webp"],
    // Every image is served by src/app/content, with a content hash in its path. No query strings.
    localPatterns: [{ pathname: "/content/**", search: "" }],
  },
  // The loader reads content/ with paths built at run time, so say which routes need it.
  outputFileTracingIncludes: {
    "/": devotionalFiles,
    "/devotionals/*": devotionalFiles,
    "/content/**": devotionalFiles,
    // The Bible reader reads its chapter files the same way; keep them out of every other route.
    "/bible/**": ["./content/bibles/**/*"],
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
