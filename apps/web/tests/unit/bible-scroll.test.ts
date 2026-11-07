// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { scrollToCurrent } from "@/components/bible/scroll-to-current";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const rect = (top: number) => ({ top }) as DOMRect;

/** A scroll box 300px tall with a 44px row at `rowTop` (page coordinates) inside an outer scroller. */
function setup({
  boxTop,
  boxScroll,
  rowTop,
}: {
  boxTop: number;
  boxScroll: number;
  rowTop: number;
}) {
  const outer = document.createElement("div");
  const box = document.createElement("div");
  box.dataset.scroll = "";
  const row = document.createElement("a");
  box.append(row);
  outer.append(box);
  document.body.append(outer);
  Object.defineProperty(box, "clientHeight", { value: 300 });
  Object.defineProperty(row, "clientHeight", { value: 44 });
  box.scrollTop = boxScroll;
  box.getBoundingClientRect = () => rect(boxTop);
  row.getBoundingClientRect = () => rect(rowTop);
  return { outer, box, row };
}

describe("scrollToCurrent", () => {
  it("centres the row in its own scroll box", () => {
    // The row is 600px below the top of the box's content, so centring puts 600 - (300 - 44) / 2 at the top.
    const { box, row } = setup({ boxTop: 100, boxScroll: 0, rowTop: 700 });
    scrollToCurrent(row);
    expect(box.scrollTop).toBe(600 - (300 - 44) / 2);
  });

  it("allows for a box that is already scrolled", () => {
    const { box, row } = setup({ boxTop: 100, boxScroll: 200, rowTop: 300 });
    scrollToCurrent(row);
    // Content position of the row: (300 - 100) + 200 = 400.
    expect(box.scrollTop).toBe(400 - (300 - 44) / 2);
  });

  it("scrolls only that box: the page and the outer container stay where they are", () => {
    // jsdom has no scrollIntoView; give it one so the test can prove it is never called.
    HTMLElement.prototype.scrollIntoView = () => {};
    const into = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
    const { outer, row } = setup({ boxTop: 100, boxScroll: 0, rowTop: 700 });
    scrollToCurrent(row);
    expect(into).not.toHaveBeenCalled();
    expect(outer.scrollTop).toBe(0);
  });

  it("does nothing without an element or a scroll box", () => {
    expect(() => scrollToCurrent(null)).not.toThrow();
    const lone = document.createElement("a");
    document.body.append(lone);
    expect(() => scrollToCurrent(lone)).not.toThrow();
  });
});
