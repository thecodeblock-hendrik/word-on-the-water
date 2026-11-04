import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<"input">, "type"> & { label: string };

export function Checkbox({ label, ...props }: Props) {
  return (
    <label className="flex min-h-11 items-center gap-3 font-ui text-sm text-ink">
      <input type="checkbox" className="size-5 shrink-0 accent-accent-ink" {...props} />
      {label}
    </label>
  );
}
