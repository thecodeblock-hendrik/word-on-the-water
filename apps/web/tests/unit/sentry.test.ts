import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { initSentry, scrubEvent } from "@/lib/sentry";
import * as Sentry from "@sentry/node";

const event = (partial: object) => ({ type: undefined, ...partial }) as Sentry.ErrorEvent;

const PRAYER = "Please pray for my mother, she has cancer";
const EMAIL = "jo" + "@example.com";

describe("scrubEvent", () => {
  it("removes request bodies, cookies, query strings and auth headers", () => {
    const out = scrubEvent(
      event({
        request: {
          data: { body: PRAYER },
          cookies: { theme: "dark" },
          query_string: `email=${EMAIL}`,
          headers: { authorization: "Bearer s", "x-client-ip": "1.2.3.4", accept: "json" },
        },
        user: { ip_address: "1.2.3.4" },
      }),
    );
    expect(out.request).toEqual({ headers: { accept: "json" } });
    expect(out.user).toBeUndefined();
  });

  it("masks email addresses in messages, exceptions and breadcrumbs", () => {
    const out = scrubEvent(
      event({
        message: `failed for ${EMAIL}`,
        exception: { values: [{ type: "Error", value: `bad ${EMAIL}` }] },
        breadcrumbs: [{ message: `sent to ${EMAIL}`, data: { to: EMAIL } }],
      }),
    );
    expect(JSON.stringify(out)).not.toContain(EMAIL);
    expect(out.message).toContain("[email]");
  });

  it("drops local variables from stack frames", () => {
    const out = scrubEvent(
      event({
        exception: { values: [{ stacktrace: { frames: [{ vars: { body: PRAYER } }] } }] },
      }),
    );
    expect(JSON.stringify(out)).not.toContain(PRAYER);
  });
});

describe("initSentry", () => {
  it("does nothing without a DSN", () => {
    initSentry(undefined);
    expect(Sentry.isInitialized()).toBe(false);
  });
});
