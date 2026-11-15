// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatPanel } from "@/components/chat/chat-panel";
import type { ChatReply } from "@/lib/chat/thread";

const sendChat = vi.hoisted(() => vi.fn());
vi.mock("@/lib/actions/chat", () => ({ sendChat }));

const entry = (id: string, extra: object = {}) => ({
  id,
  question: `Question ${id}?`,
  short_answer: `Short answer ${id}.`,
  explanation: `Long explanation ${id}.`,
  contested: false,
  contested_note: null,
  key_verses: ["John 3:16", "Romans 3:23–24"],
  related: [{ id: "9.9", question: "A related question?" }],
  glossary_terms: [],
  ...extra,
});

const reply = (extra: Partial<ChatReply>): ChatReply => ({
  kind: "answer",
  kb_version: "1",
  entry: null,
  term: null,
  options: [],
  text: null,
  reason: null,
  expand: false,
  ...extra,
});

const answer = (id = "2.1", extra: object = {}) =>
  reply({ kind: "answer", entry: entry(id, extra) });

function Harness({ bibleLinks = false }: { bibleLinks?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Got Questions</button>
      <ChatPanel open={open} onOpenChange={setOpen} bibleLinks={bibleLinks} />
    </>
  );
}

async function openPanel(bibleLinks = false) {
  const user = userEvent.setup();
  render(<Harness bibleLinks={bibleLinks} />);
  const trigger = screen.getByRole("button", { name: "Got Questions" });
  await user.click(trigger);
  return { user, trigger, dialog: await screen.findByRole("dialog", { name: "Got Questions" }) };
}

const box = () => screen.getByRole("textbox", { name: /question|follow-up/i });
const sendButton = () => screen.getByRole("button", { name: "Send" });
const ok = (r: ChatReply) => sendChat.mockResolvedValue({ ok: true, reply: r });

beforeEach(() => {
  sendChat.mockReset();
  sessionStorage.clear();
});
afterEach(cleanup);

describe("opening and closing", () => {
  it("moves focus to the question box and gives it back to the button on Escape", async () => {
    const { user, trigger } = await openPanel();
    expect(box()).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it("closes with the close button and with a click on the backdrop", async () => {
    const { user } = await openPanel();
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(screen.getByRole("button", { name: "Got Questions" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByTestId("chat-overlay"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("shows the privacy line and starter questions on an empty chat", async () => {
    const { dialog } = await openPanel();
    expect(within(dialog).getByText(/don't share personal details/i)).toBeDefined();
    expect(within(dialog).getByRole("button", { name: "Who is Jesus?" })).toBeDefined();
  });
});

describe("sending", () => {
  it("disables Send while the box is empty", async () => {
    const { user } = await openPanel();
    expect(sendButton()).toBeDisabled();
    await user.type(box(), "hi");
    expect(sendButton()).toBeEnabled();
  });

  it("sends on Enter and keeps a new line for Shift+Enter", async () => {
    ok(answer());
    const { user } = await openPanel();
    await user.type(box(), "line one{Shift>}{Enter}{/Shift}line two");
    expect(sendChat).not.toHaveBeenCalled();
    expect(box()).toHaveValue("line one\nline two");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(sendChat).toHaveBeenCalledTimes(1));
    expect(sendChat.mock.calls[0][0].turn).toEqual({ message: "line one\nline two" });
    await waitFor(() => expect(box()).toHaveValue(""));
  });

  it("sends the bot-check fields and keeps focus in the box", async () => {
    ok(answer());
    const { user } = await openPanel();
    await user.type(box(), "who is jesus{Enter}");
    await screen.findByText("Short answer 2.1.");
    const input = sendChat.mock.calls[0][0];
    expect(input.website).toBe("");
    expect(input.renderedAt).toBeGreaterThan(0);
    expect(box()).toHaveFocus();
  });

  it("a starter question sends its entry id, not its text", async () => {
    ok(answer());
    const { user, dialog } = await openPanel();
    await user.click(within(dialog).getByRole("button", { name: "Who is Jesus?" }));
    await waitFor(() => expect(sendChat).toHaveBeenCalled());
    expect(sendChat.mock.calls[0][0].turn).toEqual({ entry_id: "2.1" });
    expect(await screen.findByText("Short answer 2.1.")).toBeDefined();
  });

  it("a related chip sends an entry id and the context of the thread", async () => {
    ok(answer());
    const { user } = await openPanel();
    await user.type(box(), "who is jesus{Enter}");
    await user.click(await screen.findByRole("button", { name: "A related question?" }));
    await waitFor(() => expect(sendChat).toHaveBeenCalledTimes(2));
    const second = sendChat.mock.calls[1][0];
    expect(second.turn).toEqual({ entry_id: "9.9" });
    expect(second.context).toEqual({
      last_entry_id: "2.1",
      seen_entry_ids: ["2.1"],
      explained_entry_ids: [],
    });
  });

  it("Read more asks the server for the explanation", async () => {
    ok(answer());
    const { user } = await openPanel();
    await user.type(box(), "who is jesus{Enter}");
    ok(reply({ kind: "answer", entry: entry("2.1"), expand: true }));
    await user.click(await screen.findByRole("button", { name: "Read more" }));
    await waitFor(() => expect(sendChat).toHaveBeenCalledTimes(2));
    expect(sendChat.mock.calls[1][0].turn).toEqual({ action: "more" });
    expect(await screen.findByText("Long explanation 2.1.")).toBeDefined();
  });
});

describe("each kind of reply", () => {
  async function ask(r: ChatReply) {
    ok(r);
    const { user, dialog } = await openPanel();
    await user.type(box(), "a question{Enter}");
    return { user, dialog };
  }

  it("an answer shows the short answer, verses and related questions", async () => {
    await ask(answer());
    expect(await screen.findByText("Short answer 2.1.")).toBeDefined();
    expect(screen.getByText("John 3:16")).toBeDefined();
    expect(screen.getByText("Romans 3:23–24")).toBeDefined();
    expect(screen.getByText("You might also ask")).toBeDefined();
  });

  it("a contested answer carries the badge and the note", async () => {
    await ask(answer("8.3", { contested: true, contested_note: "Christians differ on this." }));
    expect(await screen.findByText("Christians differ on this")).toBeDefined();
    expect(screen.getByText("Christians differ on this.")).toBeDefined();
  });

  it("a did-you-mean shows its options as buttons", async () => {
    await ask(
      reply({
        kind: "clarify",
        text: "Did you mean one of these?",
        options: [{ id: "8.1", question: "What is baptism?" }],
      }),
    );
    expect(await screen.findByText("Did you mean one of these?")).toBeDefined();
    expect(screen.getByRole("button", { name: "What is baptism?" })).toBeDefined();
  });

  it("no answer shows the text and a way out by email", async () => {
    await ask(reply({ kind: "no_answer", text: "I don't have an answer to that." }));
    expect(await screen.findByText("I don't have an answer to that.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Email us instead" })).toHaveAttribute(
      "href",
      "mailto:hello@wordonthewater.net",
    );
  });

  it("small talk shows its text", async () => {
    await ask(reply({ kind: "smalltalk", text: "Hello. Ask a question." }));
    expect(await screen.findByText("Hello. Ask a question.")).toBeDefined();
  });

  it("a crisis reply makes the phone numbers tap-to-call links", async () => {
    await ask(
      reply({
        kind: "crisis",
        text: "Call the SADAG line on 0800 567 567 or LifeLine on 0861 322 322 now.",
      }),
    );
    const sadag = await screen.findByRole("link", { name: "0800 567 567" });
    expect(sadag).toHaveAttribute("href", "tel:0800567567");
    expect(screen.getByRole("link", { name: "0861 322 322" })).toHaveAttribute(
      "href",
      "tel:0861322322",
    );
  });

  it("a term shows its meaning", async () => {
    await ask(
      reply({
        kind: "term",
        term: { term: "Grace", meaning: "Undeserved favour.", key_verses: [], entries: [] },
      }),
    );
    expect(await screen.findByText("Undeserved favour.")).toBeDefined();
  });

  it("shows reply text as text, never as HTML", async () => {
    await ask(reply({ kind: "smalltalk", text: "<script>alert(1)</script><b>bold</b>" }));
    expect(await screen.findByText("<script>alert(1)</script><b>bold</b>")).toBeDefined();
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("b")).toBeNull();
  });
});

describe("a message the server refuses", () => {
  it("is blocked in the box with a message, and is not kept in the thread", async () => {
    ok(reply({ kind: "rejected", reason: "personal_details" }));
    const { user } = await openPanel();
    await user.type(box(), "call me on 082 555 0199{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent(/can't take personal details/i);
    expect(box()).toHaveValue("call me on 082 555 0199");
    expect(screen.queryByText("call me on 082 555 0199", { selector: "div" })).toBeNull();
    expect(sessionStorage.getItem("wotw-chat") ?? "").not.toContain("082");
  });

  it("shows a failed call as a message and keeps the typed text", async () => {
    sendChat.mockResolvedValue({ ok: false, message: "Not available right now." });
    const { user } = await openPanel();
    await user.type(box(), "who is jesus{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Not available right now.");
    expect(box()).toHaveValue("who is jesus");
  });
});

describe("the thread in this tab", () => {
  it("is announced politely and restored after a remount", async () => {
    ok(answer());
    const { user } = await openPanel();
    await user.type(box(), "who is jesus{Enter}");
    await screen.findByText("Short answer 2.1.");
    expect(screen.getByRole("log")).toHaveAttribute("aria-live", "polite");

    cleanup();
    await openPanel();
    expect(await screen.findByText("Short answer 2.1.")).toBeDefined();
    expect(screen.getByText("who is jesus")).toBeDefined();
  });

  it("Clear chat empties the screen and the storage", async () => {
    ok(answer());
    const { user } = await openPanel();
    await user.type(box(), "who is jesus{Enter}");
    await screen.findByText("Short answer 2.1.");
    await user.click(screen.getByRole("button", { name: "Clear chat" }));
    expect(screen.queryByText("Short answer 2.1.")).toBeNull();
    expect(sessionStorage.getItem("wotw-chat")).toBeNull();
    expect(screen.getByRole("button", { name: "Who is Jesus?" })).toBeDefined();
  });

  it("still works when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    ok(answer());
    const { user } = await openPanel();
    await user.type(box(), "who is jesus{Enter}");
    expect(await screen.findByText("Short answer 2.1.")).toBeDefined();
    vi.restoreAllMocks();
  });
});

describe("browse by topic", () => {
  it("lists the themes, then a theme's questions, and a question sends its id", async () => {
    ok(answer("1.1"));
    const { user, dialog } = await openPanel();
    await user.click(within(dialog).getByRole("button", { name: /Browse by topic/ }));

    expect(within(dialog).getAllByRole("button", { name: /^.+, \d+ questions$/ })).toHaveLength(14);
    await user.click(within(dialog).getByRole("button", { name: /^God, \d+ questions$/ }));
    await user.click(within(dialog).getByRole("button", { name: "Does God exist?" }));

    await waitFor(() => expect(sendChat).toHaveBeenCalled());
    expect(sendChat.mock.calls[0][0].turn).toEqual({ entry_id: "1.1" });
    expect(await screen.findByText("Short answer 1.1.")).toBeDefined();
    expect(screen.queryByRole("button", { name: /^God, \d+ questions$/ })).toBeNull();
  });

  it("Back goes from the questions to the themes, then to the chat", async () => {
    const { user, dialog } = await openPanel();
    await user.click(within(dialog).getByRole("button", { name: /Browse by topic/ }));
    await user.click(within(dialog).getByRole("button", { name: /^God, \d+ questions$/ }));

    await user.click(within(dialog).getByRole("button", { name: /Back/ }));
    expect(within(dialog).getAllByRole("button", { name: /^.+, \d+ questions$/ })).toHaveLength(14);
    await user.click(within(dialog).getByRole("button", { name: /Back/ }));
    expect(within(dialog).getByRole("button", { name: "Who is Jesus?" })).toBeDefined();
  });

  it("is also offered after a reply with no answer", async () => {
    ok(reply({ kind: "no_answer", text: "No answer." }));
    const { user, dialog } = await openPanel();
    await user.type(box(), "bread{Enter}");
    await user.click(await within(dialog).findByRole("button", { name: "Browse topics" }));
    expect(within(dialog).getAllByRole("button", { name: /^.+, \d+ questions$/ })).toHaveLength(14);
  });
});

describe("scripture references", () => {
  it("are plain text when the Bible reader is off", async () => {
    ok(answer());
    const { user } = await openPanel();
    await user.type(box(), "who is jesus{Enter}");
    expect(await screen.findByText("John 3:16")).toBeDefined();
    expect(screen.queryByRole("link", { name: "John 3:16" })).toBeNull();
  });

  it("link to the Bible reader when it is on, and a reference that does not parse stays text", async () => {
    ok(
      reply({
        kind: "answer",
        entry: entry("2.1", { key_verses: ["John 3:16", "Acts 16:15, 31–34", "Hezekiah 3:1"] }),
      }),
    );
    const { user } = await openPanel(true);
    await user.type(box(), "who is jesus{Enter}");
    expect(await screen.findByRole("link", { name: "John 3:16" })).toHaveAttribute(
      "href",
      "/bible/web/john/3?v=16",
    );
    expect(screen.getByRole("link", { name: "Acts 16:15, 31–34" })).toHaveAttribute(
      "href",
      "/bible/web/acts/16?v=15",
    );
    expect(screen.getByText("Hezekiah 3:1")).toBeDefined();
    expect(screen.queryByRole("link", { name: "Hezekiah 3:1" })).toBeNull();
  });
});
