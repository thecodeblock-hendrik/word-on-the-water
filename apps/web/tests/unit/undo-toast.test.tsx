// @vitest-environment jsdom
import { readFileSync } from "node:fs";

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
/** What the visitor asks of motion; jsdom has no matchMedia of its own. */
let reducedMotion = false;
beforeEach(() => {
  reducedMotion = false;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reducedMotion && query === "(prefers-reduced-motion: reduce)",
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  sessionStorage.clear();
  dropCleared();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-nav-away");
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

describe("the countdown ring in Undo", () => {
  const ring = () => undo().querySelector<SVGElement>("svg.countdown")!;
  /** The time the ring takes to empty, in milliseconds. */
  const ringTime = () => parseFloat(ring().style.getPropertyValue("--countdown"));
  const running = () => ring().hasAttribute("data-running");

  it("is decoration: the button is still named just Undo", () => {
    render(<UndoToast />);
    clearChat();
    expect(ring()).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button")).toHaveAccessibleName("Undo");
  });

  it("takes exactly as long to empty as Undo is offered", () => {
    render(<UndoToast />);
    clearChat();
    const offered = ringTime();
    expect(offered).toBeGreaterThan(0);
    wait(offered - 100);
    expect(status()).toHaveTextContent("Chat cleared");
    wait(200);
    expect(status()).toBeEmptyDOMElement();
  });

  it("stands still while Undo has focus, and starts again when focus leaves", () => {
    render(<UndoToast />);
    clearChat();
    expect(running()).toBe(true);
    fireEvent.focus(undo());
    expect(running()).toBe(false);
    fireEvent.blur(undo());
    expect(running()).toBe(true);
  });

  it("starts running again for the next chat that is cleared", () => {
    render(<UndoToast />);
    clearChat();
    fireEvent.focus(undo());
    // Undo takes the shelf away without a blur; the next shelf must not start out paused.
    fireEvent.click(undo());
    clearChat();
    expect(running()).toBe(true);
    wait(ringTime() + 100);
    expect(status()).toBeEmptyDOMElement();
  });
});

describe("the countdown ring's styles", () => {
  const css = readFileSync("src/app/globals.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const flat = css.replace(/\s+/g, " ");

  it("empty it over the time it is given, only where motion is welcome", () => {
    // Anywhere else, the reduced motion rule's 0.01ms would leave the ring empty at once.
    expect(flat).toContain(
      "@media (prefers-reduced-motion: no-preference) { .countdown[data-running] .countdown-time { animation: countdown var(--countdown) linear forwards; } }",
    );
    expect(flat.match(/animation: countdown /g)).toHaveLength(1);
  });

  it("go from a full circle to none of it", () => {
    expect(flat).toContain("@keyframes countdown { to { stroke-dashoffset: 100; } }");
    expect(flat).toContain(".countdown-time { stroke-dasharray: 100; }");
  });
});

describe("the shelf growing out of the bar and settling back", () => {
  const OFFERED = 8000;
  const pane = () => document.querySelector<HTMLElement>("[data-shelf]");
  const closing = () => document.querySelector<HTMLElement>('[data-shelf="closing"]');
  /** The time the closing takes, as the styles are told it. */
  const settleTime = () => parseFloat(pane()!.style.getPropertyValue("--settle"));
  const withBar = () =>
    render(
      <>
        <BottomNav devotionalHref="/devotionals/advent-01" />
        <UndoToast />
      </>,
    );

  it("takes about 350ms", () => {
    render(<UndoToast />);
    clearChat();
    expect(settleTime()).toBe(350);
  });

  it("notes, as it appears, whether it grows out of a bar or rises on its own", () => {
    withBar();
    clearChat();
    expect(pane()).toHaveAttribute("data-from", "bar");
  });

  it.each([
    ["no bar", false],
    ["the bar scrolled away", true],
  ])("rises on its own with %s", (_, away) => {
    if (away) {
      withBar();
      document.documentElement.setAttribute("data-nav-away", "");
    } else render(<UndoToast />);
    clearChat();
    expect(pane()).toHaveAttribute("data-from", "alone");
  });

  it("keeps that note while it is there, so scrolling never plays the entrance again", () => {
    withBar();
    clearChat();
    document.documentElement.setAttribute("data-nav-away", "");
    fireEvent.focus(undo()); // draws it again
    fireEvent.blur(undo());
    expect(pane()).toHaveAttribute("data-from", "bar");
  });

  it("ends the offer at once when time runs out: no words to hear, no Undo, nothing kept", () => {
    render(<UndoToast />);
    clearChat();
    wait(OFFERED);
    expect(status()).toBeEmptyDOMElement();
    expect(screen.queryByRole("button", { hidden: true })).toBeNull();
    expect(takeCleared()).toBeNull();
  });

  it("then shows only a picture of the shelf closing, which cannot be tapped, focused or heard", () => {
    render(<UndoToast />);
    clearChat();
    wait(OFFERED);
    const picture = closing()!;
    expect(picture).toHaveTextContent("Chat cleared");
    expect(status()).not.toContainElement(picture);
    expect(picture).toHaveAttribute("aria-hidden", "true");
    expect(picture).toHaveAttribute("inert");
    expect(picture).toHaveClass("pointer-events-none", "glass-surface", "lg:hidden");
    expect(picture.querySelector("button, a, [tabindex]")).toBeNull();
  });

  it("takes the picture away when the closing is over", () => {
    render(<UndoToast />);
    clearChat();
    const settle = settleTime();
    wait(OFFERED);
    wait(settle - 50);
    expect(closing()).not.toBeNull();
    wait(100);
    expect(pane()).toBeNull();
  });

  it("opens again for a chat cleared during the closing, and no old picture comes back", () => {
    render(<UndoToast />);
    clearChat();
    wait(OFFERED);
    expect(closing()).not.toBeNull();
    clearChat();
    expect(document.querySelectorAll("[data-shelf]")).toHaveLength(1);
    expect(closing()).toBeNull();
    expect(status()).toContainElement(undo());
    fireEvent.click(undo());
    expect(pane()).toBeNull();
  });

  it("goes at once, with no picture, when Undo is used or the chat is opened", () => {
    render(<UndoToast />);
    clearChat();
    fireEvent.click(undo());
    expect(pane()).toBeNull();
    clearChat();
    act(() => dropCleared()); // what opening the chat does
    expect(pane()).toBeNull();
  });

  it("goes at once when time runs out if motion is to be reduced", () => {
    reducedMotion = true;
    render(<UndoToast />);
    clearChat();
    wait(OFFERED);
    expect(pane()).toBeNull();
  });
});

describe("the shelf's movement in the styles", () => {
  const css = readFileSync("src/app/globals.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const flat = css.replace(/\s+/g, " ");
  const opening = "@media (prefers-reduced-motion: no-preference) {";
  const belowLg = flat.slice(
    flat.indexOf("@media (width < 64rem) {"),
    flat.indexOf("@keyframes shelf-grow"),
  );
  /** The one block that moves the shelf. */
  const moving = belowLg.slice(belowLg.indexOf(opening));

  it("happens only below lg, and only where motion is welcome", () => {
    expect(belowLg).toContain(opening);
    const names = /animation: shelf-[a-z-]+ var\(--settle\)/g;
    expect(moving.match(names)).toHaveLength(flat.match(names)!.length);
  });

  it.each([
    ['[data-shelf][data-from="bar"]', "shelf-grow", "backwards"],
    ['[data-shelf][data-from="alone"]', "shelf-rise", "backwards"],
    ["[data-shelf] [data-shelf-row]", "shelf-words-in", "backwards"],
    ['[data-shelf="closing"][data-from="bar"]', "shelf-settle", "forwards"],
    ['[data-shelf="closing"][data-from="alone"]', "shelf-sink", "forwards"],
    ['[data-shelf="closing"] [data-shelf-row]', "shelf-words-out", "forwards"],
  ])("moves %s with %s", (selector, name, fill) => {
    expect(moving).toMatch(
      new RegExp(
        `${selector.replace(/[[\]]/g, "\\$&")} \\{ animation: ${name} var\\(--settle\\) [^;]*${fill}; \\}`,
      ),
    );
    expect(flat).toContain(`@keyframes ${name} {`);
  });

  it("starts and ends the growing at the bar's own height", () => {
    expect(flat).toContain("@keyframes shelf-grow { from { --shelf-h: 4rem; } }");
    expect(flat).toContain("@keyframes shelf-settle { to { --shelf-h: 4rem; } }");
  });

  it("keeps the words unseen while the pane is still low enough for them to lie over the tabs", () => {
    expect(flat).toContain("@keyframes shelf-words-in { 0%, 40% { opacity: 0; } }");
    expect(flat).toContain("@keyframes shelf-words-out { 40%, 100% { opacity: 0; } }");
  });

  it("rises and sinks with a transform, leaving translate to hold the shelf in its place", () => {
    expect(flat).toContain(
      "@keyframes shelf-rise { from { opacity: 0; transform: translateY(0.875rem); } }",
    );
    expect(flat).toContain(
      "@keyframes shelf-sink { to { opacity: 0; transform: translateY(0.875rem); } }",
    );
  });

  it("shows the ring empty in the closing picture", () => {
    expect(flat).toContain('[data-shelf="closing"] .countdown-time { stroke-dashoffset: 100; }');
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
