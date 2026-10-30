import { describe, expect, it } from "vitest";

import { parseEnv } from "@/lib/env";

const valid = {
  API_BASE_URL: "http://localhost:8000",
  SERVICE_TOKEN: "a-service-token-of-sufficient-length",
};

describe("parseEnv", () => {
  it("accepts a valid environment", () => {
    expect(parseEnv(valid)).toMatchObject(valid);
  });

  it("fails when the service token is missing", () => {
    expect(() => parseEnv({ API_BASE_URL: valid.API_BASE_URL })).toThrow(/SERVICE_TOKEN/);
  });

  it("rejects a short service token", () => {
    expect(() => parseEnv({ ...valid, SERVICE_TOKEN: "short" })).toThrow(/SERVICE_TOKEN/);
  });

  it("rejects an API URL that is not a URL", () => {
    expect(() => parseEnv({ ...valid, API_BASE_URL: "not a url" })).toThrow(/API_BASE_URL/);
  });

  it("treats blank optional values as unset", () => {
    const env = parseEnv({ ...valid, VERCEL_AUTOMATION_BYPASS_SECRET: "" });
    expect(env.VERCEL_AUTOMATION_BYPASS_SECRET).toBeUndefined();
  });

  it("does not leak secret values in the error message", () => {
    let message = "";
    try {
      parseEnv({ ...valid, SERVICE_TOKEN: "leaky" });
    } catch (error) {
      message = String(error);
    }
    expect(message).toContain("SERVICE_TOKEN");
    expect(message).not.toContain("leaky");
  });
});
