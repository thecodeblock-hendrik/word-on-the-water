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

  it.each([
    ["down", 1],
    ["up", -1],
  ])("hides after more than 40px of scrolling %s, not at 40", (_, way) => {
    expect(hidden([300, 300 + way * 40])).toBe(false);
    expect(hidden([300, 300 + way * 41])).toBe(true);
  });

  it.each([
    ["down", 1],
    ["up", -1],
  ])("adds up small steps %s", (_, way) => {
    const steps = [0, 10, 20, 30, 40].map((step) => 300 + way * step);
    expect(hidden(steps)).toBe(false);
    expect(hidden([...steps, 300 + way * 50])).toBe(true);
  });

  it("measures the 40px from where the bar was shown, not from the last turn", () => {
    expect(hidden([300, 330, 270])).toBe(false);
    expect(hidden([300, 330, 259])).toBe(true);
  });

  it("stays away whichever way the page then moves: only stopping brings it back", () => {
    expect(hidden([300, 400, 396])).toBe(true);
    expect(hidden([300, 400, 200])).toBe(true);
    expect(hidden([600, 500, 700, 500])).toBe(true);
  });

  it("is always shown within 8px of the top", () => {
    expect(hidden([0, 100])).toBe(true);
    expect(hidden([0, 100, 9])).toBe(true);
    expect(hidden([0, 100, 8])).toBe(false);
    // Reached going down, from a hidden bar.
    expect(barAfterScroll({ hidden: true, from: 0 }, 8, END).hidden).toBe(false);
    expect(barAfterScroll({ hidden: true, from: 0 }, 9, END).hidden).toBe(true);
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
    const wobble = (around: number) => [3, -3, 3, -3, 3, 0].map((offset) => around + offset);
    expect(hidden([500, ...wobble(500)])).toBe(false);
    expect(hidden([300, 500, ...wobble(500)])).toBe(true);
  });

  it("does not change the state it is given", () => {
    const bar = barAt(300, END);
    barAfterScroll(bar, 900, END);
    expect(bar).toEqual(barAt(300, END));
  });
});
