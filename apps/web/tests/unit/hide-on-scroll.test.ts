import { describe, expect, it } from "vitest";

import { type BarState, barAt, barAfterScroll } from "@/lib/nav/hide-on-scroll";

/** The furthest a page of this test can scroll. */
const END = 2000;

/** The bar after each of these scroll positions in turn, starting shown at the first. */
function after(positions: number[], end = END): BarState {
  const [start, ...rest] = positions;
  return rest.reduce((bar, y) => barAfterScroll(bar, y, end), barAt(start, end));
}

const hidden = (positions: number[], end = END) => after(positions, end).hidden;

describe("the bar while scrolling", () => {
  it("starts shown, wherever the page is", () => {
    expect(barAt(0, END).hidden).toBe(false);
    expect(barAt(900, END).hidden).toBe(false);
  });

  it("hides after more than 40px of scrolling down, not at 40", () => {
    expect(hidden([300, 340])).toBe(false);
    expect(hidden([300, 341])).toBe(true);
  });

  it("adds up small steps down", () => {
    expect(hidden([300, 310, 320, 330, 340])).toBe(false);
    expect(hidden([300, 310, 320, 330, 340, 350])).toBe(true);
  });

  it("measures the 40px from the highest point reached, so scrolling up starts it again", () => {
    expect(hidden([300, 250, 290])).toBe(false);
    expect(hidden([300, 250, 291])).toBe(true);
  });

  it("comes back after 4px up, not 3", () => {
    expect(hidden([300, 400, 397])).toBe(true);
    expect(hidden([300, 400, 396])).toBe(false);
  });

  it("adds up tiny steps up", () => {
    expect(hidden([300, 400, 398])).toBe(true);
    expect(hidden([300, 400, 398, 396])).toBe(false);
  });

  it("measures the 4px from the furthest point reached while hidden", () => {
    expect(hidden([300, 400, 700, 697])).toBe(true);
    expect(hidden([300, 400, 700, 696])).toBe(false);
  });

  it("hides again after another 40px down", () => {
    expect(hidden([300, 400, 390, 430])).toBe(false);
    expect(hidden([300, 400, 390, 431])).toBe(true);
  });

  it("is always shown within 8px of the top", () => {
    expect(hidden([0, 100])).toBe(true);
    expect(after([0, 100, 9]).hidden).toBe(false);
    // Reached going down, from a hidden bar.
    expect(barAfterScroll({ hidden: true, turn: 0 }, 8, END).hidden).toBe(false);
    expect(barAfterScroll({ hidden: true, turn: 0 }, 9, END).hidden).toBe(true);
  });

  it("is always shown within 24px of the end", () => {
    expect(hidden([300, END - 25])).toBe(true);
    expect(hidden([300, END - 100, END - 24])).toBe(false);
    expect(hidden([300, END - 100, END])).toBe(false);
  });

  it("ignores the bounce past the top", () => {
    // iPhone rubber-banding: below zero counts as the top, so a next event that jumps straight to
    // 30px down is 30px of scrolling, not 90.
    expect(after([0, -60])).toEqual(barAt(0, END));
    expect(hidden([0, -60, 30])).toBe(false);
  });

  it("ignores the bounce past the end", () => {
    const atEnd = after([300, END]);
    expect(barAfterScroll(atEnd, END + 60, END)).toEqual(atEnd);
    expect(barAfterScroll(barAfterScroll(atEnd, END + 60, END), END, END)).toEqual(atEnd);
  });

  it.each([0, -200, 30, 60])("never hides on a page that can only scroll %ipx", (end) => {
    for (const y of [0, 10, 30, 45, 60, 500]) expect(hidden([0, y], end)).toBe(false);
  });

  it("does not flicker with a small wobble, shown or hidden", () => {
    const wobble = (around: number) => [3, 0, 3, 0, 3, 0].map((offset) => around + offset);
    expect(hidden([500, ...wobble(500)])).toBe(false);
    expect(hidden([300, 500, ...wobble(497)])).toBe(true);
  });

  it("does not change the state it is given", () => {
    const bar = barAt(300, END);
    barAfterScroll(bar, 900, END);
    expect(bar).toEqual(barAt(300, END));
  });
});
