export function ThisWeek({ children = "This week" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-block whitespace-nowrap rounded-full bg-accent-ink px-2 py-0.5 font-ui text-[.7rem] font-semibold uppercase tracking-[.06em] text-bg">
      {children}
    </span>
  );
}
