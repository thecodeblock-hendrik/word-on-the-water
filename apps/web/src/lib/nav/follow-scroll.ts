import { barAfterScroll, barAt } from "./hide-on-scroll";

/** Set on <html> while the bar should be out of the way; globals.css does the moving. */
const AWAY = "data-nav-away";

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

  function onScroll() {
    bar = barAfterScroll(bar, window.scrollY, end());
    root.toggleAttribute(AWAY, bar.hidden);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    window.removeEventListener("scroll", onScroll);
    root.removeAttribute(AWAY);
  };
}
