import type { CSSProperties } from "react";

/**
 * An undo arrow in a ring that empties over `ms`. Decoration only: the timer itself is the
 * caller's. While not `running` the ring is full, and running again starts it over. It is only
 * drawn in the browser, where the style below is set from script, which the CSP allows.
 */
export function CountdownRing({ running, ms }: { running: boolean; ms: number }) {
  return (
    <svg
      viewBox="0 0 30 30"
      fill="none"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="countdown size-[30px] flex-none"
      data-running={running ? "" : undefined}
      style={{ "--countdown": `${ms}ms` } as CSSProperties}
    >
      {/* pathLength makes the whole circle 100 long; the turn starts it at the top. */}
      <circle
        className="countdown-time stroke-accent"
        cx="15"
        cy="15"
        r="13"
        pathLength="100"
        transform="rotate(-90 15 15)"
      />
      <svg x="7" y="7" width="16" height="16" viewBox="0 0 24 24">
        <path d="M8 5L4 9l4 4M4 9h10a6 6 0 0 1 0 12h-3" stroke="currentColor" strokeWidth="2.4" />
      </svg>
    </svg>
  );
}
