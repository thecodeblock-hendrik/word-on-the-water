import { type Pill, pillAt, type Span, squash, stepPill } from "./pill-spring";

/** How long the pill stays once a tab has been let go, before it fades. */
const LINGER_MS = 450;
/** A pill that appears starts this much narrower on each side, and springs out. */
const BLOOM = 0.22;
/** The lift while a finger is down. */
const HELD = { x: 1.02, y: 1.06 };

/**
 * Moves the liquid pill under whichever tab of `bar` is pressed or opened, then fades it. It only
 * watches: links stay links and nothing waits for the animation. Styles are set from script,
 * because the CSP blocks a style attribute in the HTML. Returns a function that undoes it all.
 */
export function attachPill(bar: HTMLElement, pill: HTMLElement): () => void {
  let spring: Pill = pillAt({ left: 0, right: 0 });
  let target: Span = { left: 0, right: 0 };
  let under: Element | null = null;
  let held = false;
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
  function press(tab: Element | null) {
    under?.removeAttribute("data-under");
    under = tab;
    under?.setAttribute("data-under", "");
  }

  function tabAt(node: EventTarget | null) {
    const tab = (node as Element).closest<HTMLElement>("a, button");
    return tab && bar.contains(tab) && !tab.matches(":disabled") ? tab : null;
  }

  function stopWaitingForRelease() {
    window.removeEventListener("pointerup", release);
    window.removeEventListener("pointercancel", release);
  }

  function release() {
    stopWaitingForRelease();
    held = false;
    press(null);
    draw();
    fadeLater();
  }

  function onPointerDown(event: PointerEvent) {
    const tab = tabAt(event.target);
    if (!tab) return;
    held = true;
    press(tab);
    moveTo(tab);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  }

  // A tap ends in a click; Enter on a tab is a click with no press before it.
  function onClick(event: MouseEvent) {
    const tab = tabAt(event.target);
    if (!tab) return;
    moveTo(tab);
    if (!held) fadeLater();
  }

  // A dragged link swallows the release: WebKit then sends no pointerup or pointercancel.
  const noDrag = (event: Event) => event.preventDefault();

  bar.addEventListener("dragstart", noDrag);
  bar.addEventListener("pointerdown", onPointerDown);
  bar.addEventListener("click", onClick);
  return () => {
    bar.removeEventListener("dragstart", noDrag);
    bar.removeEventListener("pointerdown", onPointerDown);
    bar.removeEventListener("click", onClick);
    stopWaitingForRelease();
    press(null);
    stop();
    clearTimeout(fading);
  };
}
