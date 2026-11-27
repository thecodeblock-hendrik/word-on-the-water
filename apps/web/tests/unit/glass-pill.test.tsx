// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChapterNav } from "@/components/bible/chapter-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { GlassPill } from "@/components/layout/glass-pill";
import { findBook } from "@/lib/bible/books";

const TAB = 110;
const LINGER = 450;

// Animation frames run only when a test asks, 60 to the second.
let frames: Map<number, FrameRequestCallback>;
let clock: number;
let nextId: number;
function run(count = 1) {
  for (let i = 0; i < count && frames.size > 0; i++) {
    clock += 1000 / 60;
    const due = [...frames.values()];
    frames.clear();
    due.forEach((frame) => frame(clock));
  }
}

let reducedMotion = false;

beforeEach(() => {
  frames = new Map();
  clock = 0;
  nextId = 0;
  reducedMotion = false;
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => {
    frames.set(++nextId, frame);
    return nextId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reducedMotion && query.includes("reduced-motion"),
  }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A bar of three tabs, 110px each from 4px in; jsdom has no layout, so it is given. */
function bar() {
  const view = render(
    <nav>
      <GlassPill />
      <a href="#one">
        <svg />
        One
      </a>
      <a href="#two">
        <svg />
        Two
      </a>
      <button type="button" disabled>
        Three
      </button>
    </nav>,
  );
  const tabs = [...view.container.querySelectorAll<HTMLElement>("a, button")];
  tabs.forEach((tab, i) => {
    Object.defineProperty(tab, "offsetLeft", { value: 4 + i * TAB });
    Object.defineProperty(tab, "offsetWidth", { value: TAB });
  });
  const pill = view.container.querySelector<HTMLElement>("[data-pill]")!;
  const place = () => {
    // CSS writes scale(1, 1) as scale(1): one value stands for both.
    const [x, scaleX, scaleY = scaleX] = pill.style.transform.match(/-?[\d.]+/g)!.map(Number);
    return { x, width: parseFloat(pill.style.width), scaleX, scaleY };
  };
  const on = () => pill.hasAttribute("data-on");
  const [one, two, three] = tabs;
  return { ...view, pill, place, on, one, two, three };
}

describe("GlassPill", () => {
  it("renders hidden, with no style attribute (the CSP would block one)", () => {
    const html = renderToString(<GlassPill />);
    expect(html).not.toContain("style=");
    expect(html).not.toContain("data-on");
    expect(html).toContain('aria-hidden="true"');
  });

  it("blooms on the tab under a press, lifted while held", () => {
    const { one, on, place } = bar();
    fireEvent.pointerDown(one.querySelector("svg")!);
    expect(on()).toBe(true);
    expect(place().width).toBeLessThan(TAB);
    run(120);
    expect(place()).toMatchObject({ x: 4, width: TAB });
    expect(place().scaleY).toBeGreaterThan(1);
    expect(one).toHaveAttribute("data-under");
  });

  it("settles back to full size on release, then fades", () => {
    const { one, on, place } = bar();
    fireEvent.pointerDown(one);
    run(120);
    fireEvent.pointerUp(window);
    run(120);
    expect(place()).toMatchObject({ scaleX: 1, scaleY: 1 });
    expect(one).not.toHaveAttribute("data-under");
    vi.advanceTimersByTime(LINGER - 1);
    expect(on()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(on()).toBe(false);
  });

  it("fades after a press that is cancelled (a scroll that began on the bar)", () => {
    const { one, on } = bar();
    fireEvent.pointerDown(one);
    fireEvent.pointerCancel(window);
    vi.advanceTimersByTime(LINGER);
    expect(on()).toBe(false);
  });

  it("shows on a tab opened from the keyboard, then fades", () => {
    const { two, on, place } = bar();
    fireEvent.click(two);
    expect(on()).toBe(true);
    run(120);
    expect(place()).toMatchObject({ x: 4 + TAB, width: TAB, scaleY: 1 });
    vi.advanceTimersByTime(LINGER);
    expect(on()).toBe(false);
  });

  it("flows to the next tab, stretching on the way", () => {
    const { one, two, place } = bar();
    fireEvent.click(one);
    run(120);
    fireEvent.click(two);
    run(6);
    expect(place().width).toBeGreaterThan(TAB);
    expect(place().scaleY).toBeLessThan(1);
    run(120);
    expect(place()).toMatchObject({ x: 4 + TAB, width: TAB });
  });

  it("only watches: the link's own click is never cancelled", () => {
    const { two } = bar();
    expect(fireEvent.pointerDown(two)).toBe(true);
    expect(fireEvent.click(two)).toBe(true);
  });

  // WebKit starts a native link drag and then sends no pointerup and no pointercancel.
  it("stops a tab being dragged as a link, which would swallow the release", () => {
    const { one, unmount } = bar();
    expect(fireEvent.dragStart(one)).toBe(false);
    const nav = one.parentElement!;
    unmount();
    nav.append(one);
    expect(fireEvent.dragStart(one)).toBe(true);
  });

  it("ignores a disabled tab and the bar between tabs", () => {
    const { three, container, on } = bar();
    fireEvent.pointerDown(three);
    fireEvent.pointerDown(container.querySelector("nav")!);
    expect(on()).toBe(false);
    expect(frames.size).toBe(0);
  });

  it("stops asking for frames once it has settled", () => {
    const { one } = bar();
    fireEvent.click(one);
    run(300);
    expect(frames.size).toBe(0);
  });

  it("moves straight there, with no stretch or bounce, when motion is reduced", () => {
    reducedMotion = true;
    const { one, two, place } = bar();
    fireEvent.pointerDown(one);
    expect(place()).toMatchObject({ x: 4, width: TAB, scaleX: 1, scaleY: 1 });
    fireEvent.click(two);
    expect(place()).toMatchObject({ x: 4 + TAB, width: TAB, scaleY: 1 });
    expect(frames.size).toBe(0);
  });

  it("stops its animation and stops listening when the bar goes", () => {
    const { one, pill, unmount } = bar();
    fireEvent.pointerDown(one);
    expect(frames.size).toBe(1);
    const nav = one.parentElement!;
    unmount();
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    nav.append(one);
    fireEvent.click(one);
    fireEvent.pointerUp(window);
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(pill.isConnected).toBe(false);
  });
});

describe("the bars with a pill", () => {
  it.each([
    ["the site bar", <BottomNav key="site" devotionalHref="/devotionals/advent-01" />],
    [
      "the chat's bar",
      <BottomNav key="chat" devotionalHref="/devotionals/advent-01" variant="chat" />,
    ],
    [
      "the Bible reader's bar",
      <ChapterNav key="reader" version="bsb" book={findBook("john")!} chapter={3} />,
    ],
  ])("%s has one, behind its tabs and only below lg", (_, element) => {
    render(element);
    const pills = screen.getByRole("navigation").querySelectorAll("[data-pill]");
    expect(pills).toHaveLength(1);
    expect(pills[0]).toHaveClass("glass-pill", "-z-10", "pointer-events-none", "lg:hidden");
  });
});
