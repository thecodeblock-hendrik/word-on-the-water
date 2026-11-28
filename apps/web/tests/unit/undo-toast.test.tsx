// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ChapterNav } from "@/components/bible/chapter-nav";
import { ChatHost } from "@/components/chat/chat-host";
import { UndoToast } from "@/components/chat/undo-toast";
import { BottomNav } from "@/components/layout/bottom-nav";
import { findBook } from "@/lib/bible/books";
import { dropCleared, stashCleared, takeCleared } from "@/lib/chat/cleared";
import { openChat } from "@/lib/chat/open";
import type { ChatReply, Thread } from "@/lib/chat/thread";

vi.mock("@/lib/actions/chat", () => ({ sendChat: vi.fn(), warmChat: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/privacy" }));

const reply: ChatReply = {
  kind: "answer",
  kb_version: "1",
  entry: {
    id: "2.1",
    question: "Who is Jesus?",
    short_answer: "Short answer 2.1.",
    explanation: "Long explanation.",
    contested: false,
    contested_note: null,
    key_verses: [],
    related: [],
    glossary_terms: [],
  },
  term: null,
  options: [],
  text: null,
  reason: null,
  expand: false,
};
const thread: Thread = [
  { role: "me", text: "who is jesus" },
  { role: "bot", reply },
];

// With the chat open the rest of the page is aria-hidden, so the area is found with hidden: true.
const status = () => screen.getByRole("status", { hidden: true });
const undo = () => screen.getByRole("button", { name: "Undo" });
const clearChat = () => act(() => stashCleared({ thread, draft: "a draft" }));
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

// The panel is a lazy chunk; load it once up front so the Undo tests do not wait for it.
beforeAll(() => import("@/components/chat/chat-panel"));
beforeEach(() => {
  sessionStorage.clear();
  dropCleared();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("UndoToast", () => {
  it("has an empty status area until a chat is cleared, so a screen reader hears the change", () => {
    render(<UndoToast />);
    expect(status()).toBeEmptyDOMElement();
    clearChat();
    expect(status()).toHaveTextContent("Chat cleared");
    expect(undo()).toBeInTheDocument();
  });

  const shelf = () => undo().closest("[data-shelf]")!;

  it("is only for phones, and stands still", () => {
    render(<UndoToast />);
    clearChat();
    expect(shelf()).toHaveClass("lg:hidden");
    expect(shelf().className).not.toMatch(/animate-|translate/);
  });

  it("is a pane of the bar's glass where the bar is, as wide as it and centred", () => {
    render(<UndoToast />);
    clearChat();
    expect(shelf()).toHaveClass(
      "glass-dock",
      "glass-surface",
      "fixed",
      "z-[29]", // just behind the bar, which is 30
      "mx-auto",
      "max-w-[440px]",
      "rounded-[32px]",
    );
    expect(shelf().className).not.toMatch(/\bbg-|text-on-deep|shadow-menu/);
  });

  it("holds the words and Undo in a 52px row, Undo in the same lens as the liquid pill", () => {
    render(<UndoToast />);
    clearChat();
    const row = shelf().querySelector("[data-shelf-row]")!;
    expect(row).toHaveClass("h-13", "text-ink");
    expect(row).toContainElement(undo());
    expect(row).toHaveTextContent("Chat cleared");
    expect(undo()).toHaveClass("glass-pill", "text-ink");
  });

  it("keeps Undo outside both bars, so it is never taken for a tab", () => {
    render(
      <>
        <BottomNav devotionalHref="/devotionals/advent-01" />
        <ChapterNav version="bsb" book={findBook("john")!} chapter={3} />
        <UndoToast />
      </>,
    );
    clearChat();
    expect(screen.getAllByRole("navigation")).toHaveLength(2);
    expect(undo().closest("nav")).toBeNull();
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("goes after 8 seconds, and what was cleared is forgotten", () => {
    render(<UndoToast />);
    clearChat();
    wait(7900);
    expect(status()).toHaveTextContent("Chat cleared");
    wait(200);
    expect(status()).toBeEmptyDOMElement();
    expect(takeCleared()).toBeNull();
  });

  it("waits while Undo has keyboard focus, then gives a full 8 seconds again", () => {
    render(<UndoToast />);
    clearChat();
    wait(5000);
    fireEvent.focus(undo());
    wait(20000);
    expect(status()).toHaveTextContent("Chat cleared");
    fireEvent.blur(undo());
    wait(7900);
    expect(status()).toHaveTextContent("Chat cleared");
    wait(200);
    expect(status()).toBeEmptyDOMElement();
  });

  it("still goes after 8 seconds the next time, when Undo had focus as it was used", () => {
    render(<UndoToast />);
    clearChat();
    fireEvent.focus(undo()); // the keyboard, or a tap in Chrome on Android
    fireEvent.click(undo()); // the button goes with its shelf, and no blur is reported
    clearChat();
    wait(8100);
    expect(status()).toBeEmptyDOMElement();
  });

  it("keeps its target at least 44px tall", () => {
    render(<UndoToast />);
    clearChat();
    expect(undo().className).toMatch(/\bmin-h-11\b/);
  });
});

describe("Undo", () => {
  it("brings back the thread and the draft in the chat, and the toast goes", async () => {
    render(
      <>
        <UndoToast />
        <ChatHost />
      </>,
    );
    act(() => openChat(null));
    await screen.findByRole("dialog", { name: "Ask the Word" });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    clearChat();
    fireEvent.click(undo());
    const dialog = await screen.findByRole("dialog", { name: "Ask the Word" });
    expect(await screen.findByText("Short answer 2.1.")).toBeInTheDocument();
    expect(screen.getByText("who is jesus")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /question|follow-up/i })).toHaveValue("a draft");
    expect(dialog).toBeInTheDocument();
    expect(status()).toBeEmptyDOMElement();
  });

  it("is dropped when the visitor opens the chat the normal way, so a new chat starts empty", async () => {
    render(
      <>
        <UndoToast />
        <ChatHost />
      </>,
    );
    clearChat();
    act(() => openChat(null));
    await screen.findByRole("dialog", { name: "Ask the Word" });
    expect(status()).toBeEmptyDOMElement();
    expect(screen.queryByText("Short answer 2.1.")).toBeNull();
  });
});
