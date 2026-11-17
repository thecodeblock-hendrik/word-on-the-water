import { describe, expect, it, vi } from "vitest";

import { submitChat, warmApi, type ChatInput } from "@/lib/chat/submit";

const reply = {
  kind: "no_answer",
  kb_version: "1",
  entry: null,
  term: null,
  options: [],
  text: "No answer.",
  reason: null,
  expand: false,
};

const context = { last_entry_id: null, seen_entry_ids: [], explained_entry_ids: [] };
const input: ChatInput = {
  turn: { message: "Who is Jesus?" },
  context,
  renderedAt: 1790000000000,
  website: "",
};

const respond = (status: number, body: unknown = reply) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe("submitChat", () => {
  it("posts the turn, the context and the bot-check fields with the visitor's address", async () => {
    const post = respond(200);

    const result = await submitChat(input, "203.0.113.9", post);

    expect(result).toEqual({ ok: true, reply });
    expect(post).toHaveBeenCalledWith("/v1/chat/messages", {
      method: "POST",
      clientIp: "203.0.113.9",
      body: {
        message: "Who is Jesus?",
        context,
        rendered_at: 1790000000000,
        website: "",
      },
    });
  });

  it("sends a chip as an entry id and a button as an action", async () => {
    const post = respond(200);
    await submitChat({ ...input, turn: { entry_id: "2.1" } }, undefined, post);
    await submitChat({ ...input, turn: { action: "term", term: "grace" } }, undefined, post);

    expect(post.mock.calls[0][1].body).toMatchObject({ entry_id: "2.1" });
    expect(post.mock.calls[0][1].body).not.toHaveProperty("message");
    expect(post.mock.calls[1][1].body).toMatchObject({ action: "term", term: "grace" });
  });

  it.each([
    [429, /a lot of questions/i],
    [503, /not available/i],
    [422, /went wrong/i],
    [500, /not available/i],
  ])("turns a %i into a friendly message", async (status, message) => {
    const result = await submitChat(input, undefined, respond(status, { error: { code: "x" } }));
    expect(result).toEqual({ ok: false, message: expect.stringMatching(message) });
  });

  it("is unavailable when the API cannot be reached", async () => {
    const result = await submitChat(input, undefined, vi.fn().mockRejectedValue(new Error("down")));
    expect(result).toEqual({ ok: false, message: expect.stringMatching(/not available/i) });
  });

  it("refuses a reply that does not have the expected shape", async () => {
    const result = await submitChat(input, undefined, respond(200, { kind: "surprise" }));
    expect(result).toEqual({ ok: false, message: expect.stringMatching(/went wrong/i) });
  });

  it("never puts the message in an error result", async () => {
    const result = await submitChat(input, undefined, respond(429));
    expect(JSON.stringify(result)).not.toContain("Jesus");
  });
});

describe("warmApi", () => {
  it("makes one cheap health call so the API function is awake before the first question", async () => {
    const post = respond(200, { status: "ok" });

    await warmApi(post);

    expect(post).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledWith("/health/live", {});
  });

  it("never fails, because nobody is waiting for the answer", async () => {
    await expect(warmApi(vi.fn().mockRejectedValue(new Error("down")))).resolves.toBeUndefined();
  });
});
