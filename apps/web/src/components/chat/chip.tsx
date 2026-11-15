import type { ComponentProps } from "react";

/** A tap target that asks for something: a question, "Read more", a topic. At least 44px tall. */
export function Chip({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={`min-h-11 rounded-full border-[1.5px] border-line bg-surface px-4 py-2 text-left font-ui text-[15px] font-medium leading-snug text-ink hover:border-accent disabled:opacity-60 ${className}`}
    />
  );
}
