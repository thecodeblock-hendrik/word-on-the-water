import type { paths } from "@wotw/api-types";
import { describe, expectTypeOf, it } from "vitest";

type LiveResponse = paths["/health/live"]["get"]["responses"]["200"]["content"]["application/json"];

describe("generated API types", () => {
  it("expose typed responses for API routes", () => {
    expectTypeOf<LiveResponse>().toEqualTypeOf<{ [key: string]: string }>();
  });

  it("describe the sign-up request the web form must send", () => {
    type Body = paths["/v1/subscribers"]["post"]["requestBody"]["content"]["application/json"];
    expectTypeOf<Body>().toHaveProperty("email");
    expectTypeOf<Body>().toHaveProperty("turnstile_token");
    expectTypeOf<Body>().toHaveProperty("rendered_at");
    expectTypeOf<Body>().toHaveProperty("website");
  });

  it("know which paths exist", () => {
    expectTypeOf<keyof paths>().toEqualTypeOf<
      | "/cron/drain-outbox"
      | "/cron/retention"
      | "/health/live"
      | "/health/ready"
      | "/v1/ping"
      | "/v1/subscribers"
      | "/v1/webhooks/kit"
    >();
  });
});
