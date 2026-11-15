// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { clearThread, loadThread, saveThread } from "@/lib/chat/storage";
import type { Thread } from "@/lib/chat/thread";

const thread: Thread = [{ role: "me", text: "Who is Jesus?" }];

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("chat storage", () => {
  it("is empty at first", () => {
    expect(loadThread()).toEqual([]);
  });

  it("restores a saved thread", () => {
    saveThread(thread);
    expect(loadThread()).toEqual(thread);
  });

  it("clears the thread", () => {
    saveThread(thread);
    clearThread();
    expect(loadThread()).toEqual([]);
    expect(sessionStorage.length).toBe(0);
  });

  it("ignores stored data that is not a valid thread", () => {
    sessionStorage.setItem("wotw-chat", "{not json");
    expect(loadThread()).toEqual([]);
    sessionStorage.setItem("wotw-chat", JSON.stringify([{ role: "bot", reply: { kind: "x" } }]));
    expect(loadThread()).toEqual([]);
  });

  it("does not break when storage is blocked (private mode)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadThread()).toEqual([]);
    expect(() => saveThread(thread)).not.toThrow();
    expect(() => clearThread()).not.toThrow();
  });
});
