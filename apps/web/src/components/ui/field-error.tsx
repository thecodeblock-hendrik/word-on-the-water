import type { ReactNode } from "react";

/** Error text under a field. Link it with aria-describedby on the field. `on-deep` is for the dark band. */
export function FieldError({
  id,
  children,
  tone = "default",
}: {
  id: string;
  children?: ReactNode;
  tone?: "default" | "on-deep";
}) {
  if (!children) return null;
  return (
    <p
      id={id}
      className={`font-ui text-sm ${tone === "on-deep" ? "text-accent-on-deep" : "text-accent-ink"}`}
    >
      {children}
    </p>
  );
}
