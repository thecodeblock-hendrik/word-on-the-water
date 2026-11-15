// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  chatReturnUrl,
  clearChatReturn,
  consumeReopen,
  markChatLeft,
  requestReopen,
} from "@/lib/chat/return";

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("the way back to the chat", () => {
  it("is empty until a verse is tapped in the chat", () => {
    expect(chatReturnUrl()).toBeNull();
  });

  it("remembers the page the chat was on, and forgets it when cleared", () => {
    markChatLeft("/devotionals/advent-01?x=1");
    expect(chatReturnUrl()).toBe("/devotionals/advent-01?x=1");
    clearChatReturn();
    expect(chatReturnUrl()).toBeNull();
  });

  it.each(["https://evil.example/", "//evil.example", "javascript:alert(1)", "bible/john"])(
    "never returns an address that leaves the site: %s",
    (url) => {
      sessionStorage.setItem("wotw-chat-return", url);
      expect(chatReturnUrl()).toBeNull();
    },
  );

  it("tells listeners when it changes", () => {
    const seen = vi.fn();
    window.addEventListener("wotw:chat-return", seen);
    markChatLeft("/");
    clearChatReturn();
    window.removeEventListener("wotw:chat-return", seen);
    expect(seen).toHaveBeenCalledTimes(2);
  });

  it("asks to reopen the chat once", () => {
    expect(consumeReopen()).toBe(false);
    requestReopen();
    expect(consumeReopen()).toBe(true);
    expect(consumeReopen()).toBe(false);
  });

  it("does not break when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(chatReturnUrl()).toBeNull();
    expect(() => markChatLeft("/")).not.toThrow();
    expect(() => clearChatReturn()).not.toThrow();
    expect(() => requestReopen()).not.toThrow();
    expect(consumeReopen()).toBe(false);
  });
});
