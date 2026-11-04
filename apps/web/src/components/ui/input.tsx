import type { ComponentProps } from "react";

export const fieldClasses =
  "w-full min-h-11 min-w-0 rounded-sm border-[1.5px] border-line bg-surface px-3.5 py-3 font-ui text-base text-ink aria-[invalid=true]:border-accent-ink";

type Props = ComponentProps<"input"> & { invalid?: boolean };

export function Input({ invalid, ...props }: Props) {
  return <input className={fieldClasses} aria-invalid={invalid || undefined} {...props} />;
}
