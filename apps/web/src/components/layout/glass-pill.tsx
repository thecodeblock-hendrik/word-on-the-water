"use client";

import { useEffect, useRef } from "react";

import { attachPill } from "@/lib/nav/pill-motion";

/**
 * The liquid pill of the glass bar it is placed in: it flows to the tab that is pressed or opened,
 * then fades. Decoration only, behind the tabs, below lg.
 */
export function GlassPill() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => attachPill(ref.current!.parentElement!, ref.current!), []);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-pill
      className="glass-pill pointer-events-none absolute inset-y-1 left-0 -z-10 w-0 opacity-0 transition-opacity duration-200 data-[on]:opacity-100 lg:hidden"
    />
  );
}
