// @vitest-environment jsdom
import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChapterNav } from "@/components/bible/chapter-nav";
import { UndoToast } from "@/components/chat/undo-toast";
import { BottomNav } from "@/components/layout/bottom-nav";
import { HideBarOnScroll } from "@/components/layout/hide-bar-on-scroll";
import { findBook } from "@/lib/bible/books";
import { dropCleared, stashCleared } from "@/lib/chat/cleared";

let pathname = "/privacy";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

/** jsdom has no layout: a 3000px page in an 800px window, so it can scroll 2200px. */
let scrollY = 0;
function scrollTo(y: number) {
  scrollY = y;
  fireEvent.scroll(window);
}

const away = () => document.documentElement.hasAttribute("data-nav-away");

beforeEach(() => {
  pathname = "/privacy";
  scrollY = 0;
  vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollY);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
  vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(3000);
});

afterEach(() => {
  cleanup();
  dropCleared();
  vi.restoreAllMocks();
});

describe("HideBarOnScroll", () => {
  it("marks the page while the bar should be away, scrolling down or up", () => {
    scrollY = 900;
    render(<HideBarOnScroll />);
    expect(away()).toBe(false);
    scrollTo(600);
    expect(away()).toBe(true);
    scrollTo(590);
    expect(away()).toBe(true);
  });

  it("brings the bar back at the end of the page", () => {
    render(<HideBarOnScroll />);
    scrollTo(300);
    scrollTo(2200);
    expect(away()).toBe(false);
  });

  it("listens passively, so it never holds up scrolling", () => {
    const add = vi.spyOn(window, "addEventListener");
    render(<HideBarOnScroll />);
    const scroll = add.mock.calls.find(([type]) => type === "scroll");
    expect(scroll?.[2]).toEqual({ passive: true });
  });

  it("shows the bar on a new page or chapter, and measures from where that page is", () => {
    const view = render(<HideBarOnScroll />);
    scrollTo(900);
    expect(away()).toBe(true);
    pathname = "/bible/bsb/john/4";
    view.rerender(<HideBarOnScroll />);
    expect(away()).toBe(false);
    scrollTo(930);
    expect(away()).toBe(false);
    scrollTo(960);
    expect(away()).toBe(true);
  });

  it("keeps its state when the same page renders again", () => {
    const view = render(<HideBarOnScroll />);
    scrollTo(300);
    view.rerender(<HideBarOnScroll />);
    expect(away()).toBe(true);
  });

  it("shows the bar and stops listening when it goes", () => {
    const view = render(<HideBarOnScroll />);
    scrollTo(300);
    view.unmount();
    expect(away()).toBe(false);
    scrollTo(900);
    expect(away()).toBe(false);
  });

  it("leaves a hidden bar reachable by keyboard and screen reader", () => {
    render(
      <>
        <HideBarOnScroll />
        <BottomNav devotionalHref="/devotionals/advent-01" />
      </>,
    );
    scrollTo(300);
    const nav = screen.getByRole("navigation", { name: "Quick links" });
    expect(nav).not.toHaveAttribute("inert");
    expect(nav).not.toHaveAttribute("aria-hidden");
  });
});

describe("when the scrolling stops", () => {
  const wait = (ms: number) => vi.advanceTimersByTime(ms);

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("brings the bar back once the page has been still for 400ms, not before", () => {
    render(<HideBarOnScroll />);
    scrollTo(300);
    wait(399);
    expect(away()).toBe(true);
    wait(1);
    expect(away()).toBe(false);
  });

  it("waits again after every scroll, so the bar stays away while the page keeps moving", () => {
    render(<HideBarOnScroll />);
    for (const y of [300, 320, 340, 360]) {
      scrollTo(y);
      wait(300);
      expect(away()).toBe(true);
    }
    wait(100);
    expect(away()).toBe(false);
  });

  it("hides again only after more than 40px either way from where it stopped", () => {
    render(<HideBarOnScroll />);
    scrollTo(300);
    wait(400);
    scrollTo(340);
    expect(away()).toBe(false);
    scrollTo(260);
    expect(away()).toBe(false);
    scrollTo(259);
    expect(away()).toBe(true);
  });

  it("leaves no timer running when it goes", () => {
    const view = render(<HideBarOnScroll />);
    scrollTo(300);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("which bars hide", () => {
  const nav = () => screen.getByRole("navigation");

  it("the site bar does", () => {
    render(<BottomNav devotionalHref="/devotionals/advent-01" />);
    expect(nav()).toHaveAttribute("data-hides");
  });

  it("the chat's bar does not", () => {
    render(<BottomNav devotionalHref="/devotionals/advent-01" variant="chat" />);
    expect(nav()).not.toHaveAttribute("data-hides");
  });

  it("the Bible reader's bar does", () => {
    render(<ChapterNav version="bsb" book={findBook("john")!} chapter={3} />);
    expect(nav()).toHaveAttribute("data-hides");
  });

  it("the Undo shelf stays: it is marked as the shelf, not as something that hides", () => {
    stashCleared({ thread: [], draft: "a draft" });
    render(<UndoToast />);
    const shelf = screen.getByRole("button", { name: "Undo" }).closest("[data-shelf]");
    expect(shelf).not.toBeNull();
    expect(shelf).not.toHaveAttribute("data-hides");
  });
});

describe("the styles that move the bar", () => {
  // The rules only: comments may name anything.
  const css = readFileSync("src/app/globals.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  /** Everything about hiding, which must apply below lg only. */
  const below = css.slice(css.indexOf("@media (width < 64rem)"), css.indexOf(".ring {"));
  const flat = below.replace(/\s+/g, " ");

  it("only apply below lg", () => {
    expect(css.indexOf("@media (width < 64rem)")).toBeGreaterThan(0);
    expect(css.slice(0, css.indexOf("@media (width < 64rem)"))).not.toContain("data-nav-away");
  });

  it("move the bar its height, its distance from the edge and its shadow, so none peeks out", () => {
    expect(flat).toContain(
      "transform: translateY(calc(100% + max(0.875rem, env(safe-area-inset-bottom)) + 1.5rem));",
    );
  });

  it("never hide a bar that has keyboard focus", () => {
    expect(flat).toContain(":root[data-nav-away] [data-hides]:not(:has(:focus-visible))");
  });

  it("shrink the shelf to itself while the bar is away, unless it shows for the keyboard", () => {
    expect(flat).toContain(
      ":root[data-nav-away]:not(:has([data-hides] :focus-visible)) [data-shelf] { --shelf-h: calc(3.25rem + 2px); }",
    );
    expect(flat).toContain(
      ":root[data-nav-away]:not(:has([data-hides] :focus-visible)) [data-shelf-row] { border-bottom-color: transparent; }",
    );
  });

  it("slide in 200ms (the reduced motion rule above removes the slide)", () => {
    expect(flat).toContain("[data-hides] { transition: transform 200ms ease; }");
    expect(flat).toContain("transition: --shelf-h 200ms ease; }");
    expect(css).toContain("transition-duration: 0.01ms !important;");
  });
});
