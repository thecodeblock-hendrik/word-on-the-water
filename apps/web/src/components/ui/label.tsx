import type { ComponentProps } from "react";

export function Label(props: ComponentProps<"label">) {
  return <label className="block font-ui text-sm font-medium text-ink" {...props} />;
}
