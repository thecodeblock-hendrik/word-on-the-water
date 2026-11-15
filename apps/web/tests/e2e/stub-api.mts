/**
 * A stand-in for the FastAPI service in the e2e run, so the sign-up form can be submitted without
 * Postgres, Redis or Kit. It answers like the real API and remembers the last sign-up it got.
 */
import { createServer } from "node:http";

let last: { body: Record<string, unknown>; headers: Record<string, string | undefined> } | null =
  null;
// Webhooks by signature: tests run in parallel, so one global slot would be overwritten by a neighbour.
const webhooks = new Map<string, { body: string; headers: Record<string, string | undefined> }>();

const view = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  question: `Question ${id}?`,
  short_answer: `Short answer ${id}.`,
  explanation: `Long explanation ${id}.`,
  contested: false,
  contested_note: null,
  key_verses: ["John 3:16"],
  related: [{ id: "3.1", question: "What is the gospel?" }],
  glossary_terms: [],
  ...extra,
});
const reply = (extra: Record<string, unknown>) => ({
  kind: "answer",
  kb_version: "e2e",
  entry: null,
  term: null,
  options: [],
  text: null,
  reason: null,
  expand: false,
  ...extra,
});

/** A chat reply that depends only on this one request, so parallel tests never disturb each other. */
function chatReply(body: Record<string, unknown>) {
  const text = String(body.message ?? "").toLowerCase();
  if (typeof body.entry_id === "string") return reply({ entry: view(body.entry_id) });
  if (body.action === "more") {
    return reply({
      entry: view(
        String((body.context as { last_entry_id?: string } | undefined)?.last_entry_id ?? "2.1"),
      ),
      expand: true,
    });
  }
  if (text.includes("082")) return reply({ kind: "rejected", reason: "personal_details" });
  if (text.includes("end my life")) {
    return reply({
      kind: "crisis",
      text: "Please call the SADAG line on 0800 567 567 or LifeLine on 0861 322 322 now.",
    });
  }
  if (text.includes("baptise")) {
    const note = "Christians who hold to the Bible's authority disagree on this.";
    return reply({ entry: view("8.3", { contested: true, contested_note: note }) });
  }
  if (text.includes("jesus")) return reply({ entry: view("2.1") });
  return reply({ kind: "no_answer", text: "I don't have an answer to that." });
}

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
    const url = new URL(request.url ?? "/", "http://stub");
    if (url.pathname === "/__last_webhook") {
      return send(200, webhooks.get(url.searchParams.get("signature") ?? "") ?? null);
    }
    if (request.url === "/v1/webhooks/kit" && request.method === "POST") {
      webhooks.set(String(request.headers["x-kit-signature"]), {
        body: Buffer.concat(chunks).toString(),
        headers: {
          authorization: request.headers.authorization,
          "x-kit-signature": request.headers["x-kit-signature"] as string | undefined,
        },
      });
      const bad = request.headers["x-kit-signature"] === "t=1,v1=bad";
      return send(bad ? 401 : 200, {});
    }
    if (request.url === "/v1/chat/messages" && request.method === "POST") {
      return send(200, chatReply(JSON.parse(Buffer.concat(chunks).toString() || "{}")));
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
