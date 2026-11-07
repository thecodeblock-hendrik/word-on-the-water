import { describe, expect, it, vi } from "vitest";

import { clientIpFrom, parseSignup, submitSignup, valuesOf } from "@/lib/signup";

function form(fields: Record<string, string> = {}): FormData {
  const data = new FormData();
  const base: Record<string, string> = {
    email: "reader@example.com",
    first_name: "Ann",
    source: "landing_closing",
    website: "",
    rendered_at: "1790000000000",
    idempotency_key: "11111111-2222-3333-4444-555555555555",
    "cf-turnstile-response": "token-from-widget",
  };
  for (const [key, value] of Object.entries({ ...base, ...fields })) data.set(key, value);
  return data;
}

const reply = (status: number, body: unknown = {}) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe("parseSignup", () => {
  it("turns the form into the API's sign-up body", () => {
    const result = parseSignup(form());
    expect(result).toEqual({
      ok: true,
      data: {
        email: "reader@example.com",
        first_name: "Ann",
        source: "landing_closing",
        consent_text_version: "v1",
        website: "",
        rendered_at: 1790000000000,
        turnstile_token: "token-from-widget",
      },
      idempotencyKey: "11111111-2222-3333-4444-555555555555",
    });
  });

  it("trims the email and treats a blank first name as none", () => {
    const result = parseSignup(form({ email: "  reader@example.com ", first_name: "  " }));
    expect(result).toMatchObject({
      ok: true,
      data: { email: "reader@example.com", first_name: null },
    });
  });

  it("explains a bad email next to the field", () => {
    for (const email of ["", "nope", "a@b", "x".repeat(250) + "@e.co"]) {
      expect(parseSignup(form({ email }))).toEqual({
        ok: false,
        fieldErrors: { email: "Enter a valid email address." },
      });
    }
  });

  it("explains a name that is too long next to the field", () => {
    expect(parseSignup(form({ first_name: "n".repeat(81) }))).toEqual({
      ok: false,
      fieldErrors: { firstName: "Use 80 characters or fewer." },
    });
  });

  it("passes the hidden field through untouched so the API can catch a bot", () => {
    expect(parseSignup(form({ website: "http://spam.example" }))).toMatchObject({
      ok: true,
      data: { website: "http://spam.example" },
    });
  });

  it("asks to wait when the spam check has not produced its token yet, without calling the API", () => {
    const data = form();
    data.delete("cf-turnstile-response");
    expect(parseSignup(data)).toEqual({
      ok: false,
      message: "One moment, the spam check is still running. Please try again.",
    });
  });
});

describe("submitSignup", () => {
  const parsed = () => {
    const result = parseSignup(form());
    if (!result.ok) throw new Error("form should parse");
    return result;
  };

  it("posts to the API with the visitor's address and the idempotency key", async () => {
    const post = reply(202, { status: "check_your_inbox" });
    await submitSignup(parsed(), "203.0.113.9", post);
    expect(post).toHaveBeenCalledWith("/v1/subscribers", {
      method: "POST",
      body: parsed().data,
      clientIp: "203.0.113.9",
      idempotencyKey: "11111111-2222-3333-4444-555555555555",
    });
  });

  it("is a success on 202", async () => {
    expect(await submitSignup(parsed(), undefined, reply(202))).toEqual({ status: "success" });
  });

  it.each([
    [400, { error: { code: "turnstile_failed" } }, /check did not pass/i],
    [422, { error: { code: "validation_error" } }, /check your details/i],
    [429, { error: { code: "rate_limited" } }, /too many/i],
    [503, { error: { code: "turnstile_unavailable" } }, /not available right now/i],
    [500, {}, /not available right now/i],
  ])("explains a %i in plain words", async (status, body, message) => {
    const state = await submitSignup(parsed(), undefined, reply(status, body));
    expect(state.status).toBe("error");
    expect(state).toMatchObject({ message: expect.stringMatching(message), tokenUsed: true });
  });

  it("is a calm error when the API cannot be reached, and never shows the address", async () => {
    const state = await submitSignup(
      parsed(),
      undefined,
      vi.fn(async () => {
        throw new Error("connect ECONNREFUSED reader@example.com");
      }),
    );
    expect(state).toMatchObject({
      status: "error",
      message: expect.stringMatching(/not available/i),
    });
    expect(JSON.stringify(state)).not.toContain("reader@example.com");
  });
});

describe("clientIpFrom", () => {
  const headers = (init: Record<string, string>) => new Headers(init);

  it("uses Vercel's real-IP header first", () => {
    expect(
      clientIpFrom(headers({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.1" })),
    ).toBe("203.0.113.9");
  });

  it("falls back to the first address of x-forwarded-for", () => {
    expect(clientIpFrom(headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe(
      "198.51.100.1",
    );
  });

  it("is undefined when there is no address, or it is not one", () => {
    expect(clientIpFrom(headers({}))).toBeUndefined();
    expect(clientIpFrom(headers({ "x-real-ip": "not an address" }))).toBeUndefined();
  });
});

describe("valuesOf", () => {
  it("gives back what was typed, so a failed sign-up does not wipe the fields", () => {
    expect(valuesOf(form({ email: " reader@example.com ", first_name: "Ann" }))).toEqual({
      email: " reader@example.com ",
      firstName: "Ann",
    });
  });
});
