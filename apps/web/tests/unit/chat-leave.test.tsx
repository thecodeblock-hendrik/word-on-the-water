// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatPanel } from "@/components/chat/chat-panel";
import { dropCleared, takeCleared } from "@/lib/chat/cleared";
import { chatReturnUrl, markChatLeft } from "@/lib/chat/return";
import type { ChatReply } from "@/lib/chat/thread";

const sendChat = vi.hoisted(() => vi.fn());
vi.mock("@/lib/actions/chat", () => ({ sendChat }));

type User = ReturnType<typeof userEvent.setup>;

const answer: ChatReply = {
  kind: "answer",
  kb_version: "1",
  entry: {
    id: "2.1",
    question: "Who is Jesus?",
    short_answer: "Short answer 2.1.",
    explanation: "Long explanation.",
    contested: false,
    contested_note: null,
    key_verses: ["John 3:16"],
    related: [],
    glossary_terms: [],
  },
  term: null,
  options: [],
  text: null,
  reason: null,
  expand: false,
};

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Got Questions</button>
      <ChatPanel open={open} onOpenChange={setOpen} bibleLinks devotionalHref="/devotionals/a" />
    </>
  );
}

function screenIs(kind: "phone" | "desktop") {
  window.matchMedia = ((query: string) => ({
    matches: kind === "desktop",
    media: query,
  })) as never;
}

const box = () => screen.getByRole("textbox", { name: /question|follow-up/i });

async function openAndAsk() {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole("button", { name: "Got Questions" }));
  await screen.findByRole("dialog", { name: "Got Questions" });
  sendChat.mockResolvedValue({ ok: true, reply: answer });
  await user.type(box(), "who is jesus{Enter}");
  await screen.findByText("Short answer 2.1.");
  return user;
}

async function reopen(user: User) {
  await user.click(screen.getByRole("button", { name: "Got Questions" }));
  await screen.findByRole("dialog", { name: "Got Questions" });
}

beforeEach(() => {
  sendChat.mockReset();
  sessionStorage.clear();
  dropCleared();
  screenIs("phone");
});
afterEach(cleanup);

describe("leaving the chat on a phone", () => {
  it.each([
    ["the close button", (u: User) => u.click(screen.getByRole("button", { name: "Close" }))],
    ["Escape", (u: User) => u.keyboard("{Escape}")],
    ["the backdrop", (u: User) => u.click(screen.getByTestId("chat-overlay"))],
    ["a bar button", (u: User) => u.click(screen.getByRole("link", { name: "Shore" }))],
  ])("clears the thread, the draft and the storage on %s", async (_name, leave) => {
    const user = await openAndAsk();
    await user.type(box(), "a draft");
    screen
      .getByRole("link", { name: "Shore" })
      .addEventListener("click", (e) => e.preventDefault());
    await leave(user);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(sessionStorage.getItem("wotw-chat")).toBeNull();

    await reopen(user);
    expect(screen.queryByText("Short answer 2.1.")).toBeNull();
    expect(screen.getByRole("button", { name: "Who is Jesus?" })).toBeDefined();
    expect(box()).toHaveValue("");
  });

  it("clears the way back from the chat so the Bible shows Shore", async () => {
    const user = await openAndAsk();
    markChatLeft("/");
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(chatReturnUrl()).toBeNull();
  });

  it("keeps what was cleared in memory for Undo", async () => {
    const user = await openAndAsk();
    await user.type(box(), "a draft");
    await user.click(screen.getByRole("button", { name: "Close" }));
    const cleared = takeCleared();
    expect(cleared?.draft).toBe("a draft");
    expect(cleared?.thread.map((t) => t.role)).toEqual(["me", "bot"]);
  });

  it("keeps nothing for Undo when the chat was empty", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Got Questions" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(takeCleared()).toBeNull();
  });

  it("does not clear when a verse link is followed, so the Bible can bring the chat back", async () => {
    const user = await openAndAsk();
    const verse = screen.getByRole("link", { name: "John 3:16" });
    verse.addEventListener("click", (e) => e.preventDefault());
    await user.click(verse);
    expect(sessionStorage.getItem("wotw-chat")).not.toBeNull();
    expect(chatReturnUrl()).not.toBeNull();
    expect(takeCleared()).toBeNull();
  });
});

describe("leaving the chat on a desktop", () => {
  it("keeps the thread, because the drawer is unchanged", async () => {
    screenIs("desktop");
    const user = await openAndAsk();
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await reopen(user);
    expect(screen.getByText("Short answer 2.1.")).toBeDefined();
    expect(takeCleared()).toBeNull();
  });
});
