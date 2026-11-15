import { describe, expect, it } from "vitest";

import {
  addReply,
  addVisitor,
  buildContext,
  MAX_IDS,
  MAX_THREAD,
  parseReply,
  type ChatReply,
  type Thread,
} from "@/lib/chat/thread";

const entry = (id: string) => ({
  id,
  question: `Question ${id}?`,
  short_answer: "Short.",
  explanation: "Long.",
  contested: false,
  contested_note: null,
  key_verses: ["John 3:16"],
  related: [],
  glossary_terms: [],
});

const answer = (id: string, expand = false): ChatReply => ({
  kind: "answer",
  kb_version: "1",
  entry: entry(id),
  term: null,
  options: [],
  text: null,
  reason: null,
  expand,
});

const other = (kind: ChatReply["kind"]): ChatReply => ({ ...answer("1.1"), kind, entry: null });

describe("parseReply", () => {
  it("accepts what the API sends", () => {
    expect(parseReply(answer("2.1")).success).toBe(true);
  });

  it("refuses a reply with an unknown kind or a missing field", () => {
    expect(parseReply({ ...answer("2.1"), kind: "oops" }).success).toBe(false);
    expect(parseReply({ kind: "answer" }).success).toBe(false);
    expect(parseReply(null).success).toBe(false);
  });
});

describe("the thread", () => {
  it("grows with the visitor's text and the replies", () => {
    let thread: Thread = [];
    thread = addVisitor(thread, "Who is Jesus?");
    thread = addReply(thread, answer("2.1"));
    expect(thread.map((t) => t.role)).toEqual(["me", "bot"]);
  });

  it("keeps only the newest 30 items", () => {
    let thread: Thread = [];
    for (let i = 0; i < 40; i++) thread = addVisitor(thread, `q${i}`);
    expect(thread).toHaveLength(MAX_THREAD);
    expect(thread[0]).toEqual({ role: "me", text: "q10" });
  });
});

describe("buildContext", () => {
  it("is empty for an empty thread", () => {
    expect(buildContext([])).toEqual({
      last_entry_id: null,
      seen_entry_ids: [],
      explained_entry_ids: [],
    });
  });

  it("takes the last answer, every answer seen and the expanded ones", () => {
    let thread: Thread = [];
    thread = addReply(thread, answer("2.1"));
    thread = addReply(thread, answer("2.1", true));
    thread = addReply(thread, answer("3.5"));
    thread = addReply(thread, other("clarify"));
    expect(buildContext(thread)).toEqual({
      last_entry_id: "3.5",
      seen_entry_ids: ["2.1", "3.5"],
      explained_entry_ids: ["2.1"],
    });
  });

  it("ignores replies that are not answers and the visitor's own text", () => {
    let thread: Thread = [];
    thread = addVisitor(thread, "hello");
    thread = addReply(thread, other("smalltalk"));
    thread = addReply(thread, other("crisis"));
    expect(buildContext(thread).last_entry_id).toBeNull();
  });

  it("caps the ids at 20, keeping the most recent", () => {
    let thread: Thread = [];
    for (let i = 1; i <= 25; i++) thread = addReply(thread, answer(`1.${i}`));
    const { seen_entry_ids } = buildContext(thread);
    expect(seen_entry_ids).toHaveLength(MAX_IDS);
    expect(seen_entry_ids.at(-1)).toBe("1.25");
    expect(seen_entry_ids[0]).toBe("1.6");
  });
});
