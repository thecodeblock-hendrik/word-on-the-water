import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/lib/api-client";

const env = { API_BASE_URL: "http://api.test", SERVICE_TOKEN: "service-token-1234567890" };

function setup(extraEnv = {}) {
  const fetchMock = vi.fn(async () => new Response("{}", { status: 202 }));
  const apiFetch = createApiClient({ ...env, ...extraEnv }, fetchMock as unknown as typeof fetch);
  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    return { url, init, headers: new Headers(init.headers) };
  };
  return { apiFetch, lastCall };
}

describe("createApiClient", () => {
  it("calls the API base URL with the service token", async () => {
    const { apiFetch, lastCall } = setup();
    await apiFetch("/v1/ping");
    const { url, headers } = lastCall();
    expect(url).toBe("http://api.test/v1/ping");
    expect(headers.get("authorization")).toBe("Bearer service-token-1234567890");
  });

  it("forwards the real client IP", async () => {
    const { apiFetch, lastCall } = setup();
    await apiFetch("/v1/ping", { clientIp: "203.0.113.9" });
    expect(lastCall().headers.get("x-forwarded-for")).toBe("203.0.113.9");
  });

  it("sends JSON bodies with the right content type", async () => {
    const { apiFetch, lastCall } = setup();
    await apiFetch("/v1/subscribers", { method: "POST", body: { email: "a@example.com" } });
    const { init, headers } = lastCall();
    expect(init.method).toBe("POST");
    expect(headers.get("content-type")).toBe("application/json");
    expect(init.body).toBe('{"email":"a@example.com"}');
  });

  it("adds the Vercel protection bypass header only when configured", async () => {
    const without = setup();
    await without.apiFetch("/x");
    expect(without.lastCall().headers.has("x-vercel-protection-bypass")).toBe(false);

    const withSecret = setup({ API_BYPASS_SECRET: "bypass-secret" });
    await withSecret.apiFetch("/x");
    expect(withSecret.lastCall().headers.get("x-vercel-protection-bypass")).toBe("bypass-secret");
  });

  it("never caches and has a timeout", async () => {
    const { apiFetch, lastCall } = setup();
    await apiFetch("/x");
    const { init } = lastCall();
    expect(init.cache).toBe("no-store");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
