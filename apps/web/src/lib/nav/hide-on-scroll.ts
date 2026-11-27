/**
 * When the navigation bar hides while reading (docs/design/landing_nav_new.html): it leaves on the
 * way down and returns on the way up, and is always there at the top and the end of the page.
 */

/**
 * `turn` is the furthest scroll position reached against the next change: the highest point while
 * the bar is shown, the lowest while it is hidden.
 */
export type BarState = { hidden: boolean; turn: number };

/** The bar is always shown this close to the top, and to the end. */
const TOP_ZONE = 8;
const END_ZONE = 24;
/** It hides after more than this much scrolling down, so a wobble does not hide it. */
const HIDE_AFTER = 40;
/** This much scrolling up brings it back. */
const SHOW_AFTER = 4;

/** An iPhone bounces past both ends; that is not scrolling. `end` is below 0 on a short page. */
const onPage = (y: number, end: number) => Math.max(0, Math.min(end, y));

/** A shown bar, as on a page that has just opened at `y`. `end` is the furthest it can scroll. */
export const barAt = (y: number, end: number): BarState => ({
  hidden: false,
  turn: onPage(y, end),
});

/** The bar after the page has scrolled to `y`. */
export function barAfterScroll(bar: BarState, y: number, end: number): BarState {
  const at = onPage(y, end);
  if (at <= TOP_ZONE || at >= end - END_ZONE) return barAt(at, end);
  if (bar.hidden) {
    return bar.turn - at >= SHOW_AFTER
      ? barAt(at, end)
      : { hidden: true, turn: Math.max(bar.turn, at) };
  }
  return at - bar.turn > HIDE_AFTER
    ? { hidden: true, turn: at }
    : { hidden: false, turn: Math.min(bar.turn, at) };
}
