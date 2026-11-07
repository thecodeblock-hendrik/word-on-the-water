"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";

import { PickBook } from "@/components/bible/pick-book";
import { PickChapter } from "@/components/bible/pick-chapter";
import { PickVerses } from "@/components/bible/pick-verses";
import { VersionList } from "@/components/bible/version-list";
import { buttonClasses } from "@/components/ui/button";
import { findBook } from "@/lib/bible/books";
import {
  chooseBook,
  chooseChapter,
  chooseVersion,
  type PickerState,
  readHref,
  type Step,
  STEPS,
} from "@/lib/bible/picker";
import { passageTitle } from "@/lib/bible/reference";
import { VERSIONS } from "@/lib/bible/versions";

const LABELS: Record<Step, string> = {
  bible: "Bible",
  book: "Book",
  chapter: "Chapter",
  verses: "Verses",
};

const heading =
  "mb-4 font-display text-[1.3rem] font-semibold uppercase tracking-[.06em] text-ink outline-none";

/**
 * Full-screen picker for phones and tablets: Bible, Book, Chapter, Verses. Each choice moves on to
 * the next step; any step can be revisited; Read opens the passage. Unfinished choices are dropped
 * when it closes.
 */
export function PassageSheet({ state: current }: { state: PickerState }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("book");
  const [state, setState] = useState(current);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // After a step change (not on opening) put focus on the new heading, so a screen reader says where it is.
  useEffect(() => {
    if (moved.current) headingRef.current?.focus();
  }, [step]);

  const book = findBook(state.book)!;
  const shown = findBook(current.book)!;
  const title = passageTitle(
    shown,
    current.chapter,
    current.from === null || current.to === null ? null : { from: current.from, to: current.to },
  );

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setState(current);
      setStep("book");
      moved.current = false;
    }
  }

  function next(to: Step, update: PickerState) {
    moved.current = true;
    setState(update);
    setStep(to);
  }

  function read() {
    setOpen(false);
    router.push(readHref(state));
  }

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
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 grid grid-rows-[auto_auto_minmax(0,1fr)] bg-bg pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] md:left-1/2 md:right-auto md:w-[34rem] md:-translate-x-1/2 md:border-x md:border-line"
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-2">
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
            <Dialog.Title className="flex-1 font-ui text-[17px] font-semibold text-ink">
              Choose passage
            </Dialog.Title>
            <button type="button" onClick={read} className={buttonClasses("primary")}>
              Read
            </button>
          </div>

          <nav aria-label="Steps" className="border-b border-line">
            <ol className="m-0 flex list-none p-0">
              {STEPS.map((s, i) => (
                <li key={s} className="flex-1">
                  <button
                    type="button"
                    aria-current={s === step ? "step" : undefined}
                    onClick={() => {
                      moved.current = true;
                      setStep(s);
                    }}
                    className="min-h-11 w-full border-b-[3px] border-transparent px-1 font-ui text-[14px] font-semibold text-muted aria-[current=step]:border-accent aria-[current=step]:text-ink"
                  >
                    {i + 1} {LABELS[s]}
                    {i < STEPS.indexOf(step) && (
                      <span aria-hidden="true" className="text-accent-ink">
                        {" "}
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="overflow-y-auto p-4">
            {step === "bible" && (
              <>
                <h2 ref={headingRef} tabIndex={-1} className={heading}>
                  Choose a Bible
                </h2>
                <VersionList
                  versions={VERSIONS}
                  value={state.version}
                  onChange={(id) => next("book", chooseVersion(state, id))}
                />
              </>
            )}
            {step === "book" && (
              <>
                <h2 ref={headingRef} tabIndex={-1} className={heading}>
                  Choose a book
                </h2>
                <PickBook
                  value={state.book}
                  onChange={(slug) => next("chapter", chooseBook(state, slug))}
                />
              </>
            )}
            {step === "chapter" && (
              <>
                <h2 ref={headingRef} tabIndex={-1} className={heading}>
                  Choose a chapter in {book.name}
                </h2>
                <PickChapter
                  book={book}
                  value={state.chapter}
                  onChange={(chapter) => next("verses", chooseChapter(state, chapter))}
                />
              </>
            )}
            {step === "verses" && (
              <>
                <h2 ref={headingRef} tabIndex={-1} className={heading}>
                  Choose verses
                </h2>
                <PickVerses book={book} state={state} onChange={setState} />
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
