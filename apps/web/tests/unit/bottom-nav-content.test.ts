import { describe, expect, it } from "vitest";

import { bottomNav } from "@/content/bottom-nav";
import { chat } from "@/content/chat";

describe("bottom navigation labels", () => {
  it("names the three buttons and the Shore button", () => {
    expect(bottomNav.devotional).toBe("Devotional");
    expect(bottomNav.bible).toBe("Bible");
    expect(bottomNav.gotQuestions).toBe("Got Questions");
    expect(bottomNav.shore).toBe("Shore");
  });

  it("labels the landmark and keeps the chat title in step with the chat", () => {
    expect(bottomNav.landmark).toBe("Quick links");
    expect(bottomNav.gotQuestions).toBe(chat.title);
  });
});
