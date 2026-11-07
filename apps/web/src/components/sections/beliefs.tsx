import { beliefs } from "@/content/landing";

/** Short statement of faith. Pass fullStatementHref once a full statement exists. */
export function Beliefs({ fullStatementHref }: { fullStatementHref?: string }) {
  return (
    <div id="believe" className="grid content-start gap-3">
      <p className="font-display text-sm font-semibold uppercase tracking-[.18em] text-accent-ink">
        {beliefs.eyebrow}
      </p>
      <h2 className="font-display text-[clamp(2rem,4.5vw,2.75rem)] font-semibold uppercase leading-[1.05] tracking-[.04em] text-balance">
        {beliefs.heading}
      </h2>
      <ul role="list" className="m-0 mt-3 grid list-none gap-3.5 p-0">
        {beliefs.points.map((point) => (
          <li
            key={point}
            className="relative pl-[22px] before:absolute before:left-0 before:top-[.75em] before:h-0.5 before:w-2.5 before:bg-accent"
          >
            {point}
          </li>
        ))}
      </ul>
      {fullStatementHref ? (
        <p className="mt-3">
          <a href={fullStatementHref} className="text-accent-ink underline">
            Read our full statement of faith
          </a>
        </p>
      ) : null}
    </div>
  );
}
