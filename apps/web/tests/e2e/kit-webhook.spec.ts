import { expect, test } from "@playwright/test";

const STUB = "http://localhost:3101";
const RAW = '{"subscriber": {"id": 1},  "note": "é"}';

test("the Kit webhook address passes the exact body and signature to the API", async ({
  request,
}) => {
  const response = await request.post("/api/webhooks/kit", {
    headers: { "content-type": "application/json", "x-kit-signature": "t=1,v1=good" },
    data: Buffer.from(RAW),
  });
  expect(response.status()).toBe(200);
  expect(await response.text()).toBe("");

  // Another webhook arriving in between (tests run in parallel against one stub) must not hide ours.
  await request.post("/api/webhooks/kit", {
    headers: { "content-type": "application/json", "x-kit-signature": "t=1,v1=other" },
    data: Buffer.from("{}"),
  });

  const seen = await (
    await request.get(`${STUB}/__last_webhook`, { params: { signature: "t=1,v1=good" } })
  ).json();
  expect(seen.body).toBe(RAW);
  expect(seen.headers["x-kit-signature"]).toBe("t=1,v1=good");
  // The signature is the credential: no service token goes along.
  expect(seen.headers.authorization).toBeUndefined();
});

test("a signature the API refuses comes back as 401 so Kit does not retry", async ({ request }) => {
  const response = await request.post("/api/webhooks/kit", {
    headers: { "content-type": "application/json", "x-kit-signature": "t=1,v1=bad" },
    data: Buffer.from("{}"),
  });
  expect(response.status()).toBe(401);
});

test("only POST is accepted", async ({ request }) => {
  expect((await request.get("/api/webhooks/kit")).status()).toBe(405);
});
