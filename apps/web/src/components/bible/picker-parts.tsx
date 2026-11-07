import { useId } from "react";

import { scrollToCurrent } from "@/components/bible/scroll-to-current";
import { BOOKS } from "@/lib/bible/books";
import { VERSIONS } from "@/lib/bible/versions";

const GROUPS = [
  { testament: "old", title: "Old Testament" },
  { testament: "new", title: "New Testament" },
] as const;

const shape =
  "inline-flex items-center justify-center rounded-sm border-[1.5px] font-ui text-[16px] font-semibold";
const cell = `${shape} border-line bg-surface text-ink hover:border-accent`;
const chosen = "border-accent-ink bg-accent-ink text-bg";

/** The Bibles as one segmented radio group; a Bible that is not available yet is disabled. */
export function VersionSegments({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  // Its own radio name: two pickers can be mounted at once and must not share a group.
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label="Bible version"
      className={`flex overflow-hidden rounded-sm border-[1.5px] border-line bg-bg ${className}`}
    >
      {VERSIONS.map((version) => (
        <label
          key={version.id}
          className="flex min-h-11 flex-1 cursor-pointer items-center justify-center font-ui text-[14px] font-bold text-ink has-[:checked]:bg-accent-ink has-[:checked]:text-bg has-[:disabled]:cursor-not-allowed has-[:disabled]:text-muted has-[:disabled]:opacity-70 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-4 has-[:focus-visible]:outline-accent"
        >
          <input
            type="radio"
            name={name}
            value={version.id}
            aria-label={version.short}
            checked={value === version.id}
            disabled={!version.enabled}
            onChange={() => onChange(version.id)}
            className="sr-only"
          />
          <span aria-hidden="true">
            {version.enabled ? version.short : `${version.short} soon`}
          </span>
        </label>
      ))}
    </div>
  );
}

/** A filter box and the 66 books in two groups. `fluid` is the larger phone size. */
export function BookList({
  value,
  query,
  onQuery,
  onChoose,
  fluid = false,
}: {
  value: string;
  query: string;
  onQuery: (query: string) => void;
  onChoose: (slug: string) => void;
  fluid?: boolean;
}) {
  const needle = query.trim().toLowerCase();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <input
        type="search"
        aria-label="Find a book"
        placeholder="Find a book"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        className={`w-full rounded-sm border-[1.5px] border-line bg-surface px-3 font-ui text-ink placeholder:text-muted ${fluid ? "min-h-12 text-[17px]" : "min-h-11 text-[16px]"}`}
      />
      <nav aria-label="Books" data-scroll className="min-h-0 flex-1 overflow-y-auto pr-2">
        {GROUPS.map(({ testament, title }) => {
          const books = BOOKS.filter(
            (b) => b.testament === testament && b.name.toLowerCase().includes(needle),
          );
          if (books.length === 0) return null;
          return (
            <div key={testament} className="grid">
              <p className="px-1.5 pb-1 pt-3 font-ui text-[13px] text-muted">{title}</p>
              {books.map((b) => (
                <button
                  key={b.slug}
                  type="button"
                  ref={b.slug === value ? scrollToCurrent : undefined}
                  aria-current={b.slug === value ? "true" : undefined}
                  onClick={() => onChoose(b.slug)}
                  className={`flex items-center gap-2 rounded-sm px-2.5 text-left font-ui font-semibold text-ink hover:bg-surface aria-[current=true]:bg-accent-ink aria-[current=true]:text-bg ${fluid ? "min-h-12 text-[17px]" : "min-h-11 text-[16px]"}`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

/** The chapters of a book as a grid, in pages of 25 (tabs) for a long book. */
export function ChapterGrid({
  value,
  pages,
  pageIndex,
  onPage,
  onChoose,
  fluid = false,
}: {
  value: number;
  pages: { first: number; last: number }[];
  pageIndex: number;
  onPage: (index: number) => void;
  onChoose: (chapter: number) => void;
  fluid?: boolean;
}) {
  const { first, last } = pages[pageIndex];
  return (
    <>
      {pages.length > 1 && (
        <div role="tablist" aria-label="Chapters" className="mb-2.5 flex flex-wrap gap-1.5">
          {pages.map((p, i) => (
            <button
              key={p.first}
              type="button"
              role="tab"
              aria-selected={i === pageIndex}
              onClick={() => onPage(i)}
              className="min-h-11 rounded-sm border-[1.5px] border-line px-3 font-ui text-[14px] font-semibold text-ink aria-selected:border-ink aria-selected:bg-ink aria-selected:text-bg"
            >
              {p.first} to {p.last}
            </button>
          ))}
        </div>
      )}
      <div
        className={`grid gap-1.5 ${fluid ? "grid-cols-5 gap-2" : "grid-cols-[repeat(5,2.75rem)]"}`}
      >
        {Array.from({ length: last - first + 1 }, (_, i) => first + i).map((chapter) => (
          <button
            key={chapter}
            type="button"
            aria-label={`Chapter ${chapter}`}
            aria-current={chapter === value ? "true" : undefined}
            onClick={() => onChoose(chapter)}
            className={`${cell} ${fluid ? "min-h-12 w-full text-[17px]" : "size-11"} aria-[current=true]:border-ink aria-[current=true]:bg-ink aria-[current=true]:text-bg`}
          >
            {chapter}
          </button>
        ))}
      </div>
    </>
  );
}

/** One verse cell: chosen verses join into a band, rounded at its ends and at the edges of a row. */
function verseClasses(n: number, from: number | null, to: number | null, fluid: boolean) {
  const size = fluid ? "min-h-11 w-full" : "size-11";
  if (from === null || to === null || n < from || n > to) return `${cell} ${size}`;
  const joinedLeft = n > from && n % 7 !== 1;
  const joinedRight = n < to && n % 7 !== 0;
  return [
    shape,
    size,
    chosen,
    joinedLeft ? "rounded-l-none" : "",
    joinedRight ? "rounded-r-none shadow-[.25rem_0_0_var(--accent-ink)]" : "",
  ].join(" ");
}

/** The verses of a chapter as a grid; the chosen verses join into one band. */
export function VerseGrid({
  last,
  from,
  to,
  onPick,
  fluid = false,
}: {
  last: number;
  from: number | null;
  to: number | null;
  onPick: (verse: number) => void;
  fluid?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Verses"
      className={`grid gap-x-1 gap-y-1.5 ${fluid ? "grid-cols-7" : "grid-cols-[repeat(7,2.75rem)]"}`}
    >
      {Array.from({ length: last }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Verse ${n}`}
          aria-pressed={from !== null && to !== null && n >= from && n <= to}
          onClick={() => onPick(n)}
          className={verseClasses(n, from, to, fluid)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

/** The hint under the verse grid: what to do next. */
export function verseHint(anchor: number | null, verb: "Click" | "Tap") {
  return anchor === null
    ? `${verb} a verse, then a second verse to read a range.`
    : `Now ${verb.toLowerCase()} the last verse, or this verse again to read just it.`;
}
