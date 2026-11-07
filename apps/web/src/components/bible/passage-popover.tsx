"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useState } from "react";

import { scrollToCurrent } from "@/components/bible/scroll-to-current";
import { buttonClasses } from "@/components/ui/button";
import { BOOKS, findBook } from "@/lib/bible/books";
import { lastVerseOf } from "@/lib/bible/counts";
import {
  chapterPages,
  chooseBook,
  chooseChapter,
  chooseVerses,
  chooseVersion,
  type PickerState,
  pickVerse,
  readHref,
} from "@/lib/bible/picker";
import { passageTitle } from "@/lib/bible/reference";
import { findVersion, VERSIONS } from "@/lib/bible/versions";

const GROUPS = [
  { testament: "old", title: "Old Testament" },
  { testament: "new", title: "New Testament" },
] as const;

const shape =
  "inline-flex size-11 items-center justify-center rounded-sm border-[1.5px] font-ui text-[16px] font-semibold";
const cell = `${shape} border-line bg-surface text-ink hover:border-accent`;

/** One verse cell: chosen verses join into a band, rounded at its ends and at the edges of a row. */
function verseClasses(n: number, from: number | null, to: number | null) {
  if (from === null || to === null || n < from || n > to) return cell;
  const joinedLeft = n > from && n % 7 !== 1;
  const joinedRight = n < to && n % 7 !== 0;
  return [
    shape,
    "border-accent-ink bg-accent-ink text-bg",
    joinedLeft ? "rounded-l-none" : "",
    joinedRight ? "rounded-r-none shadow-[.25rem_0_0_var(--accent-ink)]" : "",
  ].join(" ");
}

/**
 * From lg: one button that opens a picker with books, chapters and verses side by side. Click a
 * verse for that verse, click a second for a range. Nothing changes until Read, and the choices
 * are dropped when it closes.
 */
export function PassagePopover({ state: current }: { state: PickerState }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(current);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<number | null>(null);

  const book = findBook(state.book)!;
  const shown = findBook(current.book)!;
  const title = passageTitle(
    shown,
    current.chapter,
    current.from === null || current.to === null ? null : { from: current.from, to: current.to },
  );
  const chosen = passageTitle(
    book,
    state.chapter,
    state.from === null || state.to === null ? null : { from: state.from, to: state.to },
  );
  const last = lastVerseOf(state.version, book, state.chapter);
  const pages = chapterPages(book);
  const pageIndex = page ?? Math.floor((state.chapter - 1) / 25);
  const { first, last: end } = pages[pageIndex];
  const needle = query.trim().toLowerCase();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setState(current);
      setAnchor(null);
      setQuery("");
      setPage(null);
    }
  }

  function read() {
    setOpen(false);
    router.push(readHref(state));
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger
        aria-label={`Change passage: ${title}`}
        className="inline-flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-sm border-[1.5px] border-line bg-surface px-4 text-left font-ui text-[17px] font-semibold text-ink hover:border-accent"
      >
        <span className="truncate">{title}</span>
        <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3 flex-none">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" />
        </svg>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-deep/60" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[max(1rem,6dvh)] z-50 flex h-[min(35rem,calc(100dvh-2rem))] w-[min(55rem,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-line bg-bg shadow-menu"
        >
          <div className="flex items-center gap-4 border-b border-line px-4 py-2.5">
            <Dialog.Title className="sr-only">Choose passage</Dialog.Title>
            <div
              role="radiogroup"
              aria-label="Bible version"
              className="flex w-56 flex-none overflow-hidden rounded-sm border-[1.5px] border-line bg-bg"
            >
              {VERSIONS.map((version) => (
                <label
                  key={version.id}
                  className="flex min-h-11 flex-1 cursor-pointer items-center justify-center font-ui text-[14px] font-bold text-ink has-[:checked]:bg-accent-ink has-[:checked]:text-bg has-[:disabled]:cursor-not-allowed has-[:disabled]:text-muted has-[:disabled]:opacity-70 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-4 has-[:focus-visible]:outline-accent"
                >
                  <input
                    type="radio"
                    name="popover-version"
                    value={version.id}
                    aria-label={version.short}
                    checked={state.version === version.id}
                    disabled={!version.enabled}
                    onChange={() => setState(chooseVersion(state, version.id))}
                    className="sr-only"
                  />
                  <span aria-hidden="true">
                    {version.enabled ? version.short : `${version.short} soon`}
                  </span>
                </label>
              ))}
            </div>
            <p className="flex-1 text-center font-ui text-[15px] text-muted">
              Pick from left to right. Your Bible: {findVersion(state.version)?.name}.
            </p>
            <Dialog.Close
              aria-label="Close"
              className="inline-flex size-11 flex-none items-center justify-center rounded-sm border-[1.5px] border-line text-ink"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
                <path
                  d="M4 4l12 12M16 4L4 16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </Dialog.Close>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[14.5rem_17rem_minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col gap-2 border-r border-line p-3.5">
              <input
                type="search"
                aria-label="Find a book"
                placeholder="Find a book"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-11 w-full rounded-sm border-[1.5px] border-line bg-surface px-3 font-ui text-[16px] text-ink placeholder:text-muted"
              />
              <nav aria-label="Books" data-scroll className="min-h-0 flex-1 overflow-y-auto pr-2">
                {GROUPS.map(({ testament, title: group }) => {
                  const books = BOOKS.filter(
                    (b) => b.testament === testament && b.name.toLowerCase().includes(needle),
                  );
                  if (books.length === 0) return null;
                  return (
                    <div key={testament} className="grid">
                      <p className="px-1.5 pb-1 pt-3 font-ui text-[13px] text-muted">{group}</p>
                      {books.map((b) => (
                        <button
                          key={b.slug}
                          type="button"
                          ref={b.slug === state.book ? scrollToCurrent : undefined}
                          aria-current={b.slug === state.book ? "true" : undefined}
                          onClick={() => {
                            setState(chooseBook(state, b.slug));
                            setAnchor(null);
                            setPage(null);
                          }}
                          className="flex min-h-11 items-center justify-between gap-2 rounded-sm px-2.5 text-left font-ui text-[16px] font-semibold text-ink hover:bg-surface aria-[current=true]:bg-accent-ink aria-[current=true]:text-bg"
                        >
                          {b.name}
                          <span aria-hidden="true" className="text-[13px] font-normal">
                            {b.chapters}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </nav>
            </div>

            <div className="min-h-0 overflow-y-auto border-r border-line p-3.5">
              <h3 className="font-ui text-[17px] font-bold text-ink">{book.name}</h3>
              <p className="mb-2.5 font-ui text-[13px] text-muted">{book.chapters} chapters</p>
              {pages.length > 1 && (
                <div role="tablist" aria-label="Chapters" className="mb-2.5 flex flex-wrap gap-1.5">
                  {pages.map((p, i) => (
                    <button
                      key={p.first}
                      type="button"
                      role="tab"
                      aria-selected={i === pageIndex}
                      onClick={() => setPage(i)}
                      className="min-h-11 rounded-sm border-[1.5px] border-line px-3 font-ui text-[14px] font-semibold text-ink aria-selected:border-ink aria-selected:bg-ink aria-selected:text-bg"
                    >
                      {p.first} to {p.last}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-[repeat(5,2.75rem)] gap-1.5">
                {Array.from({ length: end - first + 1 }, (_, i) => first + i).map((chapter) => (
                  <button
                    key={chapter}
                    type="button"
                    aria-label={`Chapter ${chapter}`}
                    aria-current={chapter === state.chapter ? "true" : undefined}
                    onClick={() => {
                      setState(chooseChapter(state, chapter));
                      setAnchor(null);
                    }}
                    className={`${cell} aria-[current=true]:border-ink aria-[current=true]:bg-ink aria-[current=true]:text-bg`}
                  >
                    {chapter}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto p-3.5">
              <h3 className="font-ui text-[17px] font-bold text-ink">
                {book.name} {state.chapter}
              </h3>
              <p className="mb-2.5 font-ui text-[13px] text-muted">{last} verses</p>
              <div
                role="group"
                aria-label="Verses"
                className="grid grid-cols-[repeat(7,2.75rem)] gap-x-1 gap-y-1.5"
              >
                {Array.from({ length: last }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`Verse ${n}`}
                    aria-pressed={state.from !== null && n >= state.from && n <= state.to!}
                    onClick={() => {
                      const next = pickVerse(state, anchor, n);
                      setState(next.state);
                      setAnchor(next.anchor);
                    }}
                    className={verseClasses(n, state.from, state.to)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p aria-live="polite" className="mt-3 max-w-[34ch] font-ui text-[13px] text-muted">
                {anchor === null
                  ? "Click a verse, then a second verse to read a range."
                  : "Now click the last verse, or this verse again to read just it."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 border-t border-line bg-surface px-3.5 py-2.5">
            <output className="flex-1 font-ui text-[15px] text-muted">
              Reading <b className="font-semibold text-ink">{chosen}</b> in the{" "}
              {findVersion(state.version)?.short}
            </output>
            <button
              type="button"
              aria-pressed={state.from === null}
              onClick={() => {
                setState(chooseVerses(state, null, null));
                setAnchor(null);
              }}
              className="min-h-11 rounded-sm border-[1.5px] border-line bg-bg px-4 font-ui text-[15px] font-semibold text-ink aria-pressed:border-ink"
            >
              Whole chapter
            </button>
            <button type="button" onClick={read} className={buttonClasses("primary")}>
              Read
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
