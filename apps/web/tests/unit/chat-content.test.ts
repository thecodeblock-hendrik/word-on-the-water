import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { chat } from "@/content/chat";

const kb = JSON.parse(readFileSync("../api/app/data/faith_kb.json", "utf8")) as {
  entries: { id: string; question: string }[];
};

describe("chat starters", () => {
  it.each(chat.starters)(
    "$id is still in the knowledge base as '$question'",
    ({ id, question }) => {
      expect(kb.entries.find((e) => e.id === id)?.question).toBe(question);
    },
  );
});
