import { Fragment } from "react";

const MARKS = /(\*\*[^*]+\*\*|\*[^*]+\*|\^\d+\^|\bLORD\b)/;

/**
 * Renders devotional text: **bold**, *italic*, ^5^ verse numbers, and LORD (the ESV's
 * divine name) in small capitals. Everything else stays plain text, never HTML.
 */
export function InlineMarkdown({ children }: { children: string }) {
  return children.split(MARKS).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("^")) {
      return (
        <sup
          key={i}
          className="mr-0.5 font-ui text-[.65em] font-semibold not-italic text-accent-ink"
        >
          {part.slice(1, -1)}
        </sup>
      );
    }
    if (part === "LORD") {
      return (
        <span key={i} data-small-caps className="[font-variant-caps:small-caps]">
          Lord
        </span>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
