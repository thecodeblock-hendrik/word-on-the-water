/**
 * When the navigation bar hides: it leaves while the page is scrolled, down or up, and is always
 * there at the top and the end of the page. Bringing it back when the scrolling stops is timed in
 * follow-scroll.ts.
 */

/** `from` is where the page was when the bar was last shown: scrolling is measured from there. */
export type BarState = { hidden: boolean; from: number };

/** The bar is always shown this close to the top, and to the end. */
const TOP_ZONE = 8;
const END_ZONE = 24;
/** It hides after more than this much scrolling, so a wobble does not hide it. */
const HIDE_AFTER = 40;

/** An iPhone bounces past both ends; that is not scrolling. `end` is below 0 on a short page. */
const onPage = (y: number, end: number) => Math.max(0, Math.min(end, y));

/** A shown bar, as on a page that has just opened at `y`. `end` is the furthest it can scroll. */
export const barAt = (y: number, end: number): BarState => ({
  hidden: false,
  from: onPage(y, end),
});

/** The bar after the page has scrolled to `y`. */
export function barAfterScroll(bar: BarState, y: number, end: number): BarState {
  const at = onPage(y, end);
  if (at <= TOP_ZONE || at >= end - END_ZONE) return barAt(at, end);
  if (bar.hidden || Math.abs(at - bar.from) <= HIDE_AFTER) return bar;
  return { hidden: true, from: bar.from };
}
