import { type Pill, pillAt, type Span, squash, stepPill } from "./pill-spring";
import { tabAtPoint, tabOf } from "./tabs";

/** How long the pill stays once a tab has been let go, before it fades. */
const LINGER_MS = 450;
/** A pill that appears starts this much narrower on each side, and springs out. */
const BLOOM = 0.22;
/** A press that moves further than this is a slide, not a tap. */
const SLIDE_PX = 10;
/** The lift while a finger is down. */
const HELD = { x: 1.02, y: 1.06 };

/**
 * Moves the liquid pill under whichever tab of `bar` is pressed or opened, then fades it. A finger
 * held down can slide to another tab: the one it is let go over is opened, and letting go off the
 * bar opens nothing. A plain tap is left to the browser, so links stay links and nothing waits for
 * the animation. Styles are set from script, because the CSP blocks a style attribute in the HTML.
 * Returns a function that undoes it all.
 */
export function attachPill(bar: HTMLElement, pill: HTMLElement): () => void {
  let spring: Pill = pillAt({ left: 0, right: 0 });
  let target: Span = { left: 0, right: 0 };
  let under: Element | null = null;
  let held = false;
  let press: { pointer: number; x: number; y: number; slid: boolean } | null = null;
  // After a slide this code opens the tab, so the browser's own click for that press is blocked.
  let blockClick = false;
  let opening = false;
  let frame = 0;
  let last = 0;
  let fading: ReturnType<typeof setTimeout> | undefined;
  const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function draw() {
    const width = spring.right.x - spring.left.x;
    const lifted = held && !still();
    const scaleY = squash(width, target.right - target.left) * (lifted ? HELD.y : 1);
    pill.style.width = `${width}px`;
    pill.style.transform = `translateX(${spring.left.x}px) scale(${lifted ? HELD.x : 1}, ${scaleY})`;
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function tick(now: number) {
    const next = stepPill(spring, target, Math.max(0, now - last) / 1000);
    last = now;
    spring = next.pill;
    draw();
    frame = next.settled ? 0 : requestAnimationFrame(tick);
  }

  function moveTo(tab: HTMLElement) {
    clearTimeout(fading);
    target = { left: tab.offsetLeft, right: tab.offsetLeft + tab.offsetWidth };
    const showing = pill.hasAttribute("data-on");
    pill.setAttribute("data-on", "");
    if (still()) {
      stop();
      spring = pillAt(target);
      draw();
      return;
    }
    if (!showing) {
      const pinch = (target.right - target.left) * BLOOM;
      spring = pillAt({ left: target.left + pinch, right: target.right - pinch });
      draw();
    }
    if (!frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  function fadeLater() {
    clearTimeout(fading);
    fading = setTimeout(() => pill.removeAttribute("data-on"), LINGER_MS);
  }

  /** Marks the tab under the finger, whose icon grows. */
  function lift(tab: Element | null) {
    under?.removeAttribute("data-under");
    under = tab;
    under?.setAttribute("data-under", "");
  }

  function stopFollowing() {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
  }

  function release() {
    stopFollowing();
    press = null;
    held = false;
    lift(null);
    draw();
    fadeLater();
  }

  function onPointerDown(event: PointerEvent) {
    if (press) return; // a second finger
    blockClick = false;
    const tab = tabOf(bar, event.target);
    if (!tab) return;
    press = { pointer: event.pointerId, x: event.clientX, y: event.clientY, slid: false };
    held = true;
    lift(tab);
    moveTo(tab);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerId !== press?.pointer) return;
    const tab = tabAtPoint(bar, event.clientX, event.clientY);
    const far = Math.hypot(event.clientX - press.x, event.clientY - press.y) > SLIDE_PX;
    if (!press.slid && !far) return;
    press.slid = true;
    if (tab === under) return;
    lift(tab);
    if (tab) moveTo(tab);
  }

  function onPointerUp(event: PointerEvent) {
    if (event.pointerId !== press?.pointer) return;
    const { slid } = press;
    const tab = slid ? tabAtPoint(bar, event.clientX, event.clientY) : null;
    release();
    if (!slid) return;
    blockClick = true;
    if (!tab) return;
    opening = true;
    tab.click();
    opening = false;
  }

  function onPointerCancel(event: PointerEvent) {
    if (event.pointerId === press?.pointer) release();
  }

  // A tap ends in a click; Enter on a tab is a click with no press before it.
  function onClick(event: MouseEvent) {
    const tab = tabOf(bar, event.target);
    if (!tab) return;
    moveTo(tab);
    if (!held) fadeLater();
  }

  /** Runs first (capture). The keyboard's clicks count 0, so they are never blocked. */
  function onClickCapture(event: MouseEvent) {
    if (!blockClick || opening || event.detail === 0) return;
    blockClick = false;
    event.preventDefault();
    event.stopPropagation();
  }

  // A dragged link swallows the release: WebKit then sends no pointerup or pointercancel.
  const noDrag = (event: Event) => event.preventDefault();

  bar.addEventListener("dragstart", noDrag);
  bar.addEventListener("pointerdown", onPointerDown);
  bar.addEventListener("click", onClickCapture, true);
  bar.addEventListener("click", onClick);
  return () => {
    bar.removeEventListener("dragstart", noDrag);
    bar.removeEventListener("pointerdown", onPointerDown);
    bar.removeEventListener("click", onClickCapture, true);
    bar.removeEventListener("click", onClick);
    stopFollowing();
    lift(null);
    stop();
    clearTimeout(fading);
  };
}
