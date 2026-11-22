import type { ComponentProps } from "react";

// The bar's top line rises in a smooth curve around the middle button and meets the line again
// (104 x 30, the baseline is the bar's top border). The fill hides the border under the bump.
const LINE = "M0 29C9.5 29 8.5 1.5 18 1.5H86C95.5 1.5 94.5 29 104 29";

/** The curved bump in a bar's top line, behind a raised round button. */
export function RaisedBump(props: ComponentProps<"svg">) {
  return (
    <svg data-bump aria-hidden="true" viewBox="0 0 104 30" {...props}>
      <path d={`${LINE}V30H0Z`} className="fill-surface" />
      <path d={LINE} className="fill-none stroke-line" strokeWidth="1" />
    </svg>
  );
}
