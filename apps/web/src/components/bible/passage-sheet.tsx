"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";

import {
  BookList,
  ChapterGrid,
  VerseGrid,
  verseHint,
  VersionSegments,
} from "@/components/bible/picker-parts";
import { usePassagePicker } from "@/components/bible/use-passage-picker";
import { buttonClasses } from "@/components/ui/button";
import { findBook } from "@/lib/bible/books";
import type { PickerState } from "@/lib/bible/picker";
import { passageTitle } from "@/lib/bible/reference";
import { findVersion } from "@/lib/bible/versions";

type Tab = "book" | "chapter" | "verses";
const TABS: { id: Tab; label: string }[] = [
  { id: "book", label: "Book" },
  { id: "chapter", label: "Chapter" },
  { id: "verses", label: "Verses" },
];

const verseValue = (from: number | null, to: number | null) =>
  from === null || to === null ? "All" : from === to ? `${from}` : `${from}–${to}`;

/**
 * The picker below lg: a bottom sheet with Book, Chapter and Verses tabs that show what is chosen.
 * Choosing a book or chapter moves to the next tab; any tab can be tapped. Nothing changes until
 * Read, and unfinished choices are dropped when it closes.
 */
export function PassageSheet({ state: current }: { state: PickerState }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("book");
  const picker = usePassagePicker(current);
  const tabButtons = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const moved = useRef(false);
  const { state, book } = picker;
  const title = passageTitle(
    findBook(current.book)!,
    current.chapter,
    current.from === null || current.to === null ? null : { from: current.from, to: current.to },
  );

  // After a tab change (not on opening) focus the new tab, so a screen reader says where it is.
  useEffect(() => {
    if (moved.current) tabButtons.current[tab]?.focus();
  }, [tab]);

  function go(next: Tab) {
    moved.current = true;
    setTab(next);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      picker.reset();
      setTab("book");
      moved.current = false;
    }
  }

  function read() {
    setOpen(false);
    router.push(picker.href);
  }

  const values: Record<Tab, string> = {
    book: book.name,
    chapter: `${state.chapter}`,
    verses: verseValue(state.from, state.to),
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger
        aria-label={`Change passage: ${title}`}
        className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-sm border-[1.5px] border-line bg-surface px-3 text-left font-ui text-[17px] font-semibold text-ink"
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
          className="fixed inset-x-0 bottom-0 top-[max(2.5rem,env(safe-area-inset-top))] z-50 flex flex-col overflow-hidden rounded-t-2xl bg-bg shadow-menu md:left-1/2 md:right-auto md:w-[34rem] md:-translate-x-1/2 md:border-x md:border-line"
        >
          <div
            aria-hidden="true"
            className="mx-auto mt-2 h-1.5 w-10 flex-none rounded-full bg-line"
          />
          <div className="flex items-center gap-3 px-3 pb-2 pt-1">
            <Dialog.Title className="sr-only">Choose passage</Dialog.Title>
            <VersionSegments
              value={state.version}
              onChange={picker.chooseVersion}
              className="flex-1"
            />
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

          <div role="tablist" aria-label="Passage" className="flex border-b border-line">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                ref={(el) => {
                  tabButtons.current[id] = el;
                }}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => go(id)}
                className="flex min-h-14 flex-1 flex-col items-center justify-center border-b-[3px] border-transparent px-1 font-ui text-[17px] font-bold text-ink aria-selected:border-accent"
              >
                <span className="text-xs font-normal text-muted">{label}</span>{" "}
                <span className="max-w-full truncate">{values[id]}</span>
              </button>
            ))}
          </div>

          <div role="tabpanel" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-3">
            {tab === "book" && (
              <BookList
                fluid
                value={state.book}
                query={picker.query}
                onQuery={picker.setQuery}
                onChoose={(slug) => {
                  picker.chooseBook(slug);
                  go("chapter");
                }}
              />
            )}
            {tab === "chapter" && (
              <ChapterGrid
                fluid
                value={state.chapter}
                pages={picker.pages}
                pageIndex={picker.pageIndex}
                onPage={picker.setPage}
                onChoose={(chapter) => {
                  picker.chooseChapter(chapter);
                  go("verses");
                }}
              />
            )}
            {tab === "verses" && (
              <>
                <VerseGrid
                  fluid
                  last={picker.lastVerse}
                  from={state.from}
                  to={state.to}
                  onPick={picker.clickVerse}
                />
                <p aria-live="polite" className="mb-3 mt-3 font-ui text-[13px] text-muted">
                  {verseHint(picker.anchor, "Tap")}
                </p>
              </>
            )}
          </div>

          <div className="grid gap-2 border-t border-line bg-surface px-3 pb-[max(.875rem,env(safe-area-inset-bottom))] pt-2.5">
            <output className="font-ui text-[14px] text-muted">
              Reading <b className="font-semibold text-ink">{picker.title}</b> in the{" "}
              {findVersion(state.version)?.short}
            </output>
            <div className="flex gap-2">
              <button
                type="button"
                aria-pressed={state.from === null}
                onClick={picker.wholeChapter}
                className="min-h-11 whitespace-nowrap rounded-sm border-[1.5px] border-line bg-bg px-4 font-ui text-[15px] font-semibold text-ink aria-pressed:border-ink"
              >
                Whole chapter
              </button>
              <button type="button" onClick={read} className={`${buttonClasses("primary")} flex-1`}>
                Read
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
