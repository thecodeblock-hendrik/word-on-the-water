import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import topics from "@/content/chat-topics.json";
import { buildTopics, type KbForTopics } from "@/lib/chat/topics";

const kb = JSON.parse(readFileSync("../api/app/data/faith_kb.json", "utf8")) as KbForTopics;

describe("buildTopics", () => {
  it("groups the questions under their themes, in order", () => {
    const small: KbForTopics = {
      themes: [
        { number: 1, name: "God" },
        { number: 2, name: "Jesus Christ" },
      ],
      entries: [
        { id: "1.1", theme_number: 1, question: "Does God exist?" },
        { id: "2.1", theme_number: 2, question: "Who is Jesus?" },
        { id: "1.2", theme_number: 1, question: "Who is God?" },
      ],
    };
    expect(buildTopics(small)).toEqual([
      {
        number: 1,
        name: "God",
        entries: [
          { id: "1.1", question: "Does God exist?" },
          { id: "1.2", question: "Who is God?" },
        ],
      },
      { number: 2, name: "Jesus Christ", entries: [{ id: "2.1", question: "Who is Jesus?" }] },
    ]);
  });
});

describe("the committed chat-topics.json", () => {
  it("matches the knowledge base (run `pnpm build:chat-topics` after `make kb`)", () => {
    expect(topics).toEqual(buildTopics(kb));
  });

  it("covers all 15 themes and every question", () => {
    expect(topics).toHaveLength(15);
    expect(topics.flatMap((t) => t.entries)).toHaveLength(kb.entries.length);
  });
});
