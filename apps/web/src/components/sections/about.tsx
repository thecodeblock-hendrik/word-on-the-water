import { PlaceholderText } from "@/components/placeholder-text";
import { about } from "@/content/landing";

/** Why the ministry exists, beside who it is for. */
export function About() {
  const [lead, ...rest] = about.paragraphs;
  return (
    <section id="about" aria-labelledby="about-h" className="py-[72px]">
      <div className="mx-auto grid max-w-[1120px] items-start gap-8 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] lg:grid-cols-2 lg:gap-14">
        <div className="grid max-w-[62ch] gap-[18px]">
          <p className="font-display text-sm font-semibold uppercase tracking-[.18em] text-accent-ink">
            {about.eyebrow}
          </p>
          <h2
            id="about-h"
            className="font-display text-[clamp(2rem,4.5vw,2.75rem)] font-semibold uppercase leading-[1.05] tracking-[.04em] text-balance"
          >
            {about.heading}
          </h2>
          <p className="font-serif text-[1.25rem] leading-[1.55]">
            <PlaceholderText>{lead}</PlaceholderText>
          </p>
          {rest.map((paragraph) => (
            <p key={paragraph} className="font-serif">
              <PlaceholderText>{paragraph}</PlaceholderText>
            </p>
          ))}
        </div>
        <dl aria-label="Who this is for" className="grid border-t border-line">
          {about.who.map(({ term, description }) => (
            <div
              key={term}
              className="grid gap-1 border-b border-line py-[18px] sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-4"
            >
              <dt className="font-display font-semibold uppercase tracking-[.1em] text-accent-ink">
                {term}
              </dt>
              <dd className="m-0">{description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
