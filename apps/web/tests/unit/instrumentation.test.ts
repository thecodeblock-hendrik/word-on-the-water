import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@sentry/node", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/sentry", () => ({ initSentry: vi.fn() }));

import * as Sentry from "@sentry/node";
import { onRequestError, register } from "@/instrumentation";
import { initSentry } from "@/lib/sentry";

const request = { path: "/?email=a@b.com", method: "POST", headers: { cookie: "x" } };
const context = {
  routerKind: "App Router",
  routePath: "/app/page",
  routeType: "action",
  renderSource: undefined,
  revalidateReason: undefined,
} as const;

describe("instrumentation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports the error with route tags only, never the request", async () => {
    const error = Object.assign(new Error("boom"), { digest: "d1" });
    await onRequestError(error, request, context);
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { routePath: "/app/page", routeType: "action", digest: "d1" },
    });
  });

  it("starts Sentry on the Node.js runtime with the configured DSN", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("SENTRY_DSN", "https://k@o0.ingest.sentry.io/1");
    await register();
    expect(initSentry).toHaveBeenCalledWith("https://k@o0.ingest.sentry.io/1");
  });
});
