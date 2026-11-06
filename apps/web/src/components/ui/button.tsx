import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "primary-on-deep" | "ghost" | "outline";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border-[1.5px] px-5 py-3 font-ui text-[15px] font-semibold leading-tight transition-[filter] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-70";

const variants: Record<ButtonVariant, string> = {
  primary: "border-accent-ink bg-accent-ink text-bg hover:brightness-110",
  "primary-on-deep": "border-on-deep bg-on-deep text-deep hover:brightness-110",
  ghost: "border-current bg-transparent text-inherit hover:brightness-110",
  outline: "border-line bg-transparent text-ink hover:brightness-110",
};

/** Class names for anything that should look like a button, such as a link. */
export function buttonClasses(variant: ButtonVariant = "primary"): string {
  return `${base} ${variants[variant]}`;
}

type Props = ComponentProps<"button"> & { variant?: ButtonVariant; busy?: boolean };

export function Button({ variant = "primary", busy, type = "button", ...props }: Props) {
  return (
    <button
      {...props}
      type={type}
      className={buttonClasses(variant)}
      disabled={busy || props.disabled}
      aria-busy={busy || undefined}
    />
  );
}
