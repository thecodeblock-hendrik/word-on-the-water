import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("reports ok and is never cached", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
