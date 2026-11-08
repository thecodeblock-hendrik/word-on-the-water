import { describe, expect, it, vi } from "vitest";

import { forwardKitWebhook } from "@/lib/kit-webhook";

const env = {
  API_BASE_URL: "http://api.test",
  SERVICE_TOKEN: "service-token-1234567890",
  API_BYPASS_SECRET: "bypass-secret",
};

function delivery(body: BodyInit = '{"event":"x"}', signature = "t=1,v1=abc") {
  return new Request("https://site.test/api/webhooks/kit", {
    method: "POST",
    headers: { "content-type": "application/json", "x-kit-signature": signature },
    body,
  });
}

function setup(response: Response | Error = new Response(null, { status: 200 })) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  const forward = (request: Request) =>
    forwardKitWebhook(request, env, fetchMock as unknown as typeof fetch);
  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    return { url, init, headers: new Headers(init.headers) };
  };
  return { forward, fetchMock, lastCall };
}

describe("forwardKitWebhook", () => {
  it("posts the untouched body and the signature to the API webhook route", async () => {
    const { forward, lastCall } = setup();
    await forward(delivery('{"a": 1,  "b":"é"}', "t=1700000000,v1=deadbeef"));
    const { url, init, headers } = lastCall();
    expect(url).toBe("http://api.test/v1/webhooks/kit");
    expect(init.method).toBe("POST");
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe('{"a": 1,  "b":"é"}');
    expect(headers.get("x-kit-signature")).toBe("t=1700000000,v1=deadbeef");
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("gets past the API project's protection but never sends the service token", async () => {
    const { forward, lastCall } = setup();
    await forward(delivery());
    const { headers } = lastCall();
    expect(headers.get("x-vercel-protection-bypass")).toBe("bypass-secret");
    expect(headers.get("authorization")).toBeNull();
  });

  it("relays the API status so Kit retries a failure and stops on a bad signature", async () => {
    for (const status of [200, 401, 503]) {
      const { forward } = setup(new Response("ignored body", { status }));
      const response = await forward(delivery());
      expect(response.status).toBe(status);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("does not relay the API response body", async () => {
    const { forward } = setup(new Response('{"error":{"code":"x"}}', { status: 401 }));
    expect(await (await forward(delivery())).text()).toBe("");
  });

  it("answers 502 so Kit retries when the API cannot be reached", async () => {
    const { forward } = setup(new Error("connect ECONNREFUSED"));
    expect((await forward(delivery())).status).toBe(502);
  });

  it("refuses a body over 1 MB without calling the API", async () => {
    const { forward, fetchMock } = setup();
    const response = await forward(delivery("x".repeat(1_048_577)));
    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
