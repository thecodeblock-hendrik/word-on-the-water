import { splitPlaceholders } from "@/lib/placeholders";

/** Renders text, highlighting any [bracketed] draft copy so it cannot be missed before launch. */
export function PlaceholderText({ children }: { children: string }) {
  return splitPlaceholders(children).map((segment, i) =>
    segment.placeholder ? (
      <span
        key={i}
        data-placeholder
        className="rounded-sm border-b border-dashed border-accent bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-[.2em]"
      >
        {segment.text}
      </span>
    ) : (
      segment.text
    ),
  );
}
