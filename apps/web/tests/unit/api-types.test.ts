import type { paths } from "@wotw/api-types";
import { describe, expectTypeOf, it } from "vitest";

type LiveResponse = paths["/health/live"]["get"]["responses"]["200"]["content"]["application/json"];

describe("generated API types", () => {
  it("expose typed responses for API routes", () => {
    expectTypeOf<LiveResponse>().toEqualTypeOf<{ [key: string]: string }>();
  });

  it("know which paths exist", () => {
    expectTypeOf<keyof paths>().toEqualTypeOf<
      "/cron/drain-outbox" | "/health/live" | "/health/ready" | "/v1/ping"
    >();
  });
});
