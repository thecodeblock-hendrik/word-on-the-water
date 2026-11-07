"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Places where an arrow key already means something: typing, choosing, sliding, open dialogs and menus.
const OWN_ARROWS =
  "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='dialog'], [role='radio'], [role='slider'], [role='menu'], [role='listbox'], [role='tablist']";

/** A plain left or right arrow that nothing else is using, with no modifier (Alt+Left is the browser's Back). */
export function shouldHandleArrowKey(event: KeyboardEvent): boolean {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return false;
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return false;
  }
  return !(event.target instanceof HTMLElement && event.target.closest(OWN_ARROWS));
}

/** Left arrow opens the previous chapter and right arrow the next, where there is one. Renders nothing. */
export function ArrowKeys({ previous, next }: { previous: string | null; next: string | null }) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!shouldHandleArrowKey(event)) return;
      const href = event.key === "ArrowRight" ? next : previous;
      if (href) router.push(href);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [previous, next, router]);

  return null;
}
