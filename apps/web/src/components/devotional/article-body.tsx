import type { ReactNode } from "react";

import { InlineMarkdown } from "@/components/inline-markdown";
import { goDeeperItems, splitAmen, splitBlocks } from "@/lib/devotionals/blocks";
import type { Devotional } from "@/lib/devotionals/parse";
import type { SeriesLink } from "@/lib/devotionals/series-view";

const heading =
  "flex items-center gap-3 font-display text-[1.15rem] font-semibold uppercase tracking-[.2em] text-accent-ink after:h-px after:flex-1 after:bg-line after:content-['']";

function Section({
  id,
  title,
  className = "",
  children,
}: {
  id: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={`grid gap-4 ${className}`}>
      <h2 id={id} className={heading}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Prose({ markdown }: { markdown: string }) {
  return splitBlocks(markdown).map(({ kind, text }) =>
    kind === "quote" ? (
      <blockquote
        key={text}
        data-pull
        className="m-0 border-l-[3px] border-accent pl-[18px] font-serif text-[1.35rem] italic leading-[1.45]"
      >
        <InlineMarkdown>{text}</InlineMarkdown>
      </blockquote>
    ) : (
      <p key={text} className="text-[1.06rem]">
        <InlineMarkdown>{text}</InlineMarkdown>
      </p>
    ),
  );
}

function Conditions({ devotional }: { devotional: Devotional }) {
  return (
    <Section id="h-cond" title="Conditions">
      <blockquote
        data-scripture
        className="m-0 grid gap-3.5 rounded-md border border-line bg-surface px-[26px] py-6"
      >
        {devotional.meta.conditions.map(({ text, ref }) => (
          <div key={ref} className="grid gap-1.5">
            <p className="text-[1.08rem] italic leading-[1.75]">
              <InlineMarkdown>{text}</InlineMarkdown>
            </p>
            <cite className="font-ui text-[13px] uppercase not-italic tracking-[.16em] text-muted">
              {ref}
            </cite>
          </div>
        ))}
      </blockquote>
    </Section>
  );
}

function Prayer({ markdown }: { markdown: string }) {
  const { body, amen } = splitAmen(markdown);
  return (
    <Section id="h-pray" title="Pray">
      <p className="text-[1.06rem] italic">
        <InlineMarkdown>{body}</InlineMarkdown>
        {amen && (
          <>
            {" "}
            <span
              data-amen
              className="font-display font-semibold uppercase not-italic tracking-[.2em] text-accent-ink"
            >
              {amen}
            </span>
          </>
        )}
      </p>
    </Section>
  );
}

function GoDeeper({ markdown, next }: { markdown: string; next?: SeriesLink }) {
  return (
    <section
      aria-labelledby="h-deeper"
      className="grid gap-3 border-t border-line pt-5 font-ui text-[15.5px]"
    >
      <h2
        id="h-deeper"
        className="font-display text-base font-semibold uppercase tracking-[.2em] text-accent-ink"
      >
        Go Deeper
      </h2>
      <dl className="m-0 grid gap-3">
        {goDeeperItems(markdown).map(({ term, text }) => (
          <div key={term}>
            <dt className="font-semibold">{term}</dt>
            <dd className="m-0 mt-0.5 text-muted">
              <InlineMarkdown>{text}</InlineMarkdown>
              {term === "Read further" && next?.passage && ` Next week: ${next.passage}.`}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The sections of a devotional, in the design's order and styles. */
export function ArticleBody({ devotional, next }: { devotional: Devotional; next?: SeriesLink }) {
  const text = (name: string) => devotional.sections.find((s) => s.heading === name)?.markdown;
  const prose = (name: string, id: string, className?: string) => (
    <Section id={id} title={name} className={className}>
      <Prose markdown={text(name)!} />
    </Section>
  );
  const deeper = text("Go Deeper");
  return (
    <>
      <Conditions devotional={devotional} />
      {prose("The Lineup", "h-lineup")}
      {prose("The Word", "h-word")}
      <div className="rounded-md bg-deep p-[26px] text-on-deep [&_h2]:text-accent-on-deep [&_h2]:after:bg-on-deep/20">
        {prose("Paddle Out", "h-paddle")}
      </div>
      <Prayer markdown={text("Pray")!} />
      {deeper && <GoDeeper markdown={deeper} next={next} />}
    </>
  );
}
