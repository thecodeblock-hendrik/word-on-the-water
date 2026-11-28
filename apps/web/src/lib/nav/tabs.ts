/** Which tab of a glass bar is meant, by an event's target or by where a finger is. */

/** A finger that strays this far above or below the bar is still on it. */
const STRAY_PX = 24;

const isTab = (bar: HTMLElement, tab: HTMLElement) =>
  bar.contains(tab) && !tab.matches(":disabled");

/** The tab an event happened on. */
export function tabOf(bar: HTMLElement, node: EventTarget | null): HTMLElement | null {
  const tab = (node as Element).closest<HTMLElement>("a, button");
  return tab && isTab(bar, tab) ? tab : null;
}

/**
 * The tab under a point. Needed for a slide, because a touch keeps sending its events to the tab it
 * began on, wherever the finger has gone.
 */
export function tabAtPoint(bar: HTMLElement, x: number, y: number): HTMLElement | null {
  const box = bar.getBoundingClientRect();
  if (y < box.top - STRAY_PX || y > box.bottom + STRAY_PX) return null;
  const tabs = [...bar.querySelectorAll<HTMLElement>("a, button")];
  const found = tabs.find((tab) => {
    const { left, right, width } = tab.getBoundingClientRect();
    return width > 0 && x >= left && x <= right;
  });
  return found && isTab(bar, found) ? found : null;
}
