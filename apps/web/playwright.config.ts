import { defineConfig, devices } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  webServer: [
    {
      // Stands in for the API: see the file for what it answers.
      command: "node tests/e2e/stub-api.mts",
      url: "http://localhost:3101/health/live",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm build && pnpm start -p ${port}`,
      url: `http://localhost:${port}/`,
      reuseExistingServer: !process.env.CI,
      env: {
        // Pin the date so the tests do not change when the real calendar moves on.
        DEVOTIONAL_TODAY: "2026-12-05",
        BIBLE_ENABLED: "1",
        API_BASE_URL: "http://localhost:3101",
        SERVICE_TOKEN: "e2e-service-token-0123456789",
        // Cloudflare's always-pass test site key.
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      },
      timeout: 180_000,
    },
  ],
  projects: [
    { name: "iphone-se", use: { ...devices["iPhone SE"] } },
    { name: "iphone-13", use: { ...devices["iPhone 13"] } },
    { name: "pixel-7", use: { ...devices["Pixel 7"] } },
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "desktop-webkit", use: { ...devices["Desktop Safari"] } },
    { name: "desktop-firefox", use: { ...devices["Desktop Firefox"] } },
  ],
});
