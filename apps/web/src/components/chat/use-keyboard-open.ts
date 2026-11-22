import { useSyncExternalStore } from "react";

/** A browser bar collapsing changes the height by less than this; a keyboard by far more. */
const KEYBOARD_MIN_PX = 150;

function subscribe(onChange: () => void) {
  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", onChange);
  return () => viewport?.removeEventListener("resize", onChange);
}

function snapshot() {
  const viewport = window.visualViewport;
  return viewport ? window.innerHeight - viewport.height > KEYBOARD_MIN_PX : false;
}

/** True while the on-screen keyboard covers part of the page. */
export function useKeyboardOpen(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
