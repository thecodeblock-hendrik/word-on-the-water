import { describe, expect, it } from "vitest";

import { bottomNav } from "@/content/bottom-nav";
import { chat } from "@/content/chat";

describe("bottom navigation labels", () => {
  it("names the three buttons and the Shore button", () => {
    expect(bottomNav.devotional).toBe("Devotional");
    expect(bottomNav.bible).toBe("Bible");
    expect(bottomNav.askTheWord).toBe("Ask the Word");
    expect(bottomNav.shore).toBe("Shore");
  });

  it("labels the landmark and keeps the chat title in step with the chat", () => {
    expect(bottomNav.landmark).toBe("Quick links");
    expect(bottomNav.askTheWord).toBe(chat.title);
  });
});
