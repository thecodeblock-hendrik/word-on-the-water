import { Fragment } from "react";

import type { Block, Run } from "@/lib/bible/types";

// A paragraph indents its first line. Poetry and list lines hang: the first line sits at its level
// and a wrapped line sits 1.5rem further in, so a wrapped line is never mistaken for a new line.
const INDENT = ["", "pl-6", "pl-12", "pl-[4.5rem]"];
const HANG = ["", "pl-12 -indent-6", "pl-[4.5rem] -indent-6", "pl-24 -indent-6"];
const level = (steps: string[], n: number) => steps[Math.min(n, steps.length - 1)];

function Runs({ runs }: { runs: Run[] }) {
  return runs.map((run, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      {run.start && (
        <sup className="mr-1 font-ui text-[.7rem] font-semibold text-accent-ink">
          {run.end ? `${run.verse}-${run.end}` : run.verse}
        </sup>
      )}
      {run.text}
    </Fragment>
  ));
}

function Line({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading": {
      const className =
        "mt-8 font-display font-semibold uppercase tracking-[.06em] text-accent-ink first:mt-0";
      return block.level === 1 ? (
        <h2 className={`${className} text-[1.5rem]`}>{block.text}</h2>
      ) : block.level === 2 ? (
        <h3 className={`${className} text-[1.2rem]`}>{block.text}</h3>
      ) : (
        <h4 className={`${className} text-[1rem]`}>{block.text}</h4>
      );
    }
    case "title":
      return (
        <p className="mt-4 font-ui text-[.95rem] italic text-muted first:mt-0">{block.text}</p>
      );
    case "label":
      return (
        <p className="mt-4 font-display text-[.95rem] font-semibold uppercase tracking-[.12em] text-accent-ink first:mt-0">
          {block.text}
        </p>
      );
    case "break":
      return <div data-break aria-hidden="true" className="h-4" />;
    case "poetry":
      return (
        <p className={`mt-0 ${level(HANG, block.indent)}`}>
          <Runs runs={block.runs} />
        </p>
      );
    case "list":
      return (
        <p className={`mt-1 ${level(HANG, block.indent)}`}>
          <Runs runs={block.runs} />
        </p>
      );
    case "paragraph":
      return (
        <p className={`mt-4 first:mt-0 ${level(INDENT, block.indent)}`}>
          <Runs runs={block.runs} />
        </p>
      );
  }
}

/** The text of a passage: headings, paragraphs, poetry and verse numbers, with no inline styles. */
export function PassageText({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, i) => (
        <Line key={i} block={block} />
      ))}
    </>
  );
}
