import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/api-client", () => ({ apiFetch: vi.fn() }));

import { GET } from "@/app/api/health/route";
import { apiFetch } from "@/lib/api-client";

const apiFetchMock = vi.mocked(apiFetch);

describe("GET /api/health", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("checks API readiness through the BFF client", async () => {
    apiFetchMock.mockResolvedValue(new Response('{"status":"ok"}', { status: 200 }));
    const response = await GET();
    expect(apiFetchMock).toHaveBeenCalledWith("/health/ready");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("reports unavailable when the API is not ready", async () => {
    apiFetchMock.mockResolvedValue(new Response("{}", { status: 503 }));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("reports unavailable when the API cannot be reached", async () => {
    apiFetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });
});
