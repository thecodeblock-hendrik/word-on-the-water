import type { ComponentProps } from "react";

import { fieldClasses } from "@/components/ui/input";

type Props = ComponentProps<"textarea"> & { invalid?: boolean };

export function Textarea({ invalid, ...props }: Props) {
  return (
    <textarea
      className={`${fieldClasses} min-h-32`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}
