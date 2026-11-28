import { barAfterScroll, barAt } from "./hide-on-scroll";

/** Set on <html> while the bar should be out of the way; globals.css does the moving. */
const AWAY = "data-nav-away";
/** A hidden bar comes back after the page has been still this long. */
const RETURN_AFTER = 400;

/**
 * Follows the page's scrolling, starting with the bar shown. The bar and the Undo toast are
 * separate parts of the page, so the state lives on <html> where both can follow it. Returns a
 * function that stops, leaving the bar shown.
 */
export function followScroll(): () => void {
  const root = document.documentElement;
  const end = () => root.scrollHeight - window.innerHeight;
  let bar = barAt(window.scrollY, end());
  root.removeAttribute(AWAY);
  let still: number | undefined;

  function show(next: typeof bar) {
    bar = next;
    root.toggleAttribute(AWAY, bar.hidden);
  }

  function onScroll() {
    show(barAfterScroll(bar, window.scrollY, end()));
    window.clearTimeout(still);
    if (bar.hidden) {
      still = window.setTimeout(() => show(barAt(window.scrollY, end())), RETURN_AFTER);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.clearTimeout(still);
    root.removeAttribute(AWAY);
  };
}
