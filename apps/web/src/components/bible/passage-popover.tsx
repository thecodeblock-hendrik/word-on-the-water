"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useState } from "react";

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

/**
 * From lg: one button that opens a picker with books, chapters and verses side by side. Click a
 * verse for that verse, click a second for a range. Nothing changes until Read, and the choices
 * are dropped when it closes.
 */
export function PassagePopover({ state: current }: { state: PickerState }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const picker = usePassagePicker(current);
  const { state, book } = picker;
  const title = passageTitle(
    findBook(current.book)!,
    current.chapter,
    current.from === null || current.to === null ? null : { from: current.from, to: current.to },
  );

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) picker.reset();
  }

  function read() {
    setOpen(false);
    router.push(picker.href);
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
            <VersionSegments
              value={state.version}
              onChange={picker.chooseVersion}
              className="w-56 flex-none"
            />
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
            <div className="flex min-h-0 flex-col border-r border-line p-3.5">
              <BookList
                value={state.book}
                query={picker.query}
                onQuery={picker.setQuery}
                onChoose={picker.chooseBook}
              />
            </div>

            <div className="min-h-0 overflow-y-auto border-r border-line p-3.5">
              <h3 className="font-ui text-[17px] font-bold text-ink">{book.name}</h3>
              <p className="mb-2.5 font-ui text-[13px] text-muted">{book.chapters} chapters</p>
              <ChapterGrid
                value={state.chapter}
                pages={picker.pages}
                pageIndex={picker.pageIndex}
                onPage={picker.setPage}
                onChoose={picker.chooseChapter}
              />
            </div>

            <div className="min-h-0 overflow-y-auto p-3.5">
              <h3 className="font-ui text-[17px] font-bold text-ink">
                {book.name} {state.chapter}
              </h3>
              <p className="mb-2.5 font-ui text-[13px] text-muted">{picker.lastVerse} verses</p>
              <VerseGrid
                last={picker.lastVerse}
                from={state.from}
                to={state.to}
                onPick={picker.clickVerse}
              />
              <p aria-live="polite" className="mt-3 max-w-[34ch] font-ui text-[13px] text-muted">
                {verseHint(picker.anchor, "Click")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 border-t border-line bg-surface px-3.5 py-2.5">
            <output className="flex-1 font-ui text-[15px] text-muted">
              Reading <b className="font-semibold text-ink">{picker.title}</b> in the{" "}
              {findVersion(state.version)?.short}
            </output>
            <button
              type="button"
              aria-pressed={state.from === null}
              onClick={picker.wholeChapter}
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
