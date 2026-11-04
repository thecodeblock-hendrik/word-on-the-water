import { buttonClasses } from "@/components/ui/button";
import { start } from "@/content/landing";
import { formatReference } from "@/lib/scripture";

/** The gospel in four short parts, for readers who are new to faith. */
export function Start() {
  return (
    <section
      id="start"
      aria-labelledby="start-h"
      className="border-y border-line bg-surface py-[72px]"
    >
      <div className="mx-auto max-w-[1120px] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <div className="mb-9 grid max-w-[62ch] gap-3">
          <p className="font-display text-sm font-semibold uppercase tracking-[.18em] text-accent-ink">
            {start.eyebrow}
          </p>
          <h2
            id="start-h"
            className="font-display text-[clamp(2rem,4.5vw,2.75rem)] font-semibold uppercase leading-[1.05] tracking-[.04em] text-balance"
          >
            {start.heading}
          </h2>
          <p className="text-muted">{start.intro}</p>
        </div>
        <ol
          role="list"
          className="m-0 grid list-none gap-7 p-0 min-[520px]:grid-cols-2 lg:grid-cols-4"
        >
          {start.steps.map((step, i) => (
            <li key={step.title} className="grid content-start gap-2.5">
              <span
                aria-hidden="true"
                className="font-display text-[2.4rem] font-semibold leading-none text-accent"
              >
                {i + 1}
              </span>
              <h3 className="font-display text-xl font-semibold uppercase leading-[1.05] tracking-[.05em]">
                {step.title}
              </h3>
              <p className="text-[.98rem] text-muted">{step.body}</p>
              <cite className="font-ui text-[13px] not-italic tracking-[.04em] text-accent-ink">
                {formatReference(step.reference)}
              </cite>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href={start.talk.href} className={buttonClasses("ghost")}>
            {start.talk.label}
          </a>
          <span className="font-ui text-sm text-muted">{start.readOn}</span>
        </div>
      </div>
    </section>
  );
}
