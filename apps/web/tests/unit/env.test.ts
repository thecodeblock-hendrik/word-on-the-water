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
    const env = parseEnv({ ...valid, API_BYPASS_SECRET: "" });
    expect(env.API_BYPASS_SECRET).toBeUndefined();
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

  it("on a preview, points at the API preview of the same branch", () => {
    const env = parseEnv({
      SERVICE_TOKEN: valid.SERVICE_TOKEN,
      VERCEL_ENV: "preview",
      VERCEL_BRANCH_URL: "wotw-web-git-feat-09-vercel-thecodeblock.vercel.app",
    });
    expect(env.API_BASE_URL).toBe("https://wotw-api-git-feat-09-vercel-thecodeblock.vercel.app");
  });

  it("prefers an explicit API URL on a preview", () => {
    const env = parseEnv({
      ...valid,
      VERCEL_ENV: "preview",
      VERCEL_BRANCH_URL: "wotw-web-git-x-thecodeblock.vercel.app",
    });
    expect(env.API_BASE_URL).toBe(valid.API_BASE_URL);
  });

  it("does not derive the API URL outside previews", () => {
    const source = { SERVICE_TOKEN: valid.SERVICE_TOKEN, VERCEL_ENV: "production" };
    expect(() =>
      parseEnv({ ...source, VERCEL_BRANCH_URL: "wotw-web-git-main-x.vercel.app" }),
    ).toThrow(/API_BASE_URL/);
  });
});
