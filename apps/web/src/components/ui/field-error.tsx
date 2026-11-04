import type { ReactNode } from "react";

/** Error text under a field. Link it with aria-describedby on the field. */
export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="font-ui text-sm text-accent-ink">
      {children}
    </p>
  );
}
