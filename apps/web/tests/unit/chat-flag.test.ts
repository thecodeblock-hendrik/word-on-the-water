import { describe, expect, it } from "vitest";

import { isChatEnabled } from "@/lib/chat/flag";

describe("isChatEnabled", () => {
  it("is off unless CHAT_ENABLED is exactly 1", () => {
    expect(isChatEnabled({})).toBe(false);
    expect(isChatEnabled({ CHAT_ENABLED: "" })).toBe(false);
    expect(isChatEnabled({ CHAT_ENABLED: "0" })).toBe(false);
    expect(isChatEnabled({ CHAT_ENABLED: "true" })).toBe(false);
    expect(isChatEnabled({ CHAT_ENABLED: "1" })).toBe(true);
  });
});
