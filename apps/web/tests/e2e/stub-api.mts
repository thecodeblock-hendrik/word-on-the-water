/**
 * A stand-in for the FastAPI service in the e2e run, so the sign-up form can be submitted without
 * Postgres, Redis or Kit. It answers like the real API and remembers the last sign-up it got.
 */
import { createServer } from "node:http";

let last: { body: Record<string, unknown>; headers: Record<string, string | undefined> } | null =
  null;
let lastWebhook: { body: string; headers: Record<string, string | undefined> } | null = null;

createServer((request, response) => {
  const chunks: Buffer[] = [];
  request.on("data", (chunk: Buffer) => chunks.push(chunk));
  request.on("end", () => {
    const send = (status: number, body: unknown) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (request.url === "/health/live") return send(200, { status: "ok" });
    if (request.url === "/__last") return send(200, last);
    if (request.url === "/__last_webhook") return send(200, lastWebhook);
    if (request.url === "/v1/webhooks/kit" && request.method === "POST") {
      lastWebhook = {
        body: Buffer.concat(chunks).toString(),
        headers: {
          authorization: request.headers.authorization,
          "x-kit-signature": request.headers["x-kit-signature"] as string | undefined,
        },
      };
      const bad = request.headers["x-kit-signature"] === "t=1,v1=bad";
      return send(bad ? 401 : 200, {});
    }
    if (request.url === "/v1/subscribers" && request.method === "POST") {
      const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
      last = {
        body,
        headers: {
          authorization: request.headers.authorization,
          "idempotency-key": request.headers["idempotency-key"] as string | undefined,
          "x-client-ip": request.headers["x-client-ip"] as string | undefined,
        },
      };
      if (body.email === "limited@example.com") {
        return send(429, { error: { code: "rate_limited", message: "Too many requests." } });
      }
      if (body.email === "refused@example.com") {
        return send(400, {
          error: { code: "turnstile_failed", message: "The check did not pass." },
        });
      }
      return send(202, { status: "check_your_inbox" });
    }
    send(404, { error: { code: "not_found", message: "Request failed." } });
  });
}).listen(3101);
