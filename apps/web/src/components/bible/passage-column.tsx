"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PickVerses } from "@/components/bible/pick-verses";
import { scrollToCurrent } from "@/components/bible/scroll-to-current";
import { buttonClasses } from "@/components/ui/button";
import { BOOKS, findBook } from "@/lib/bible/books";
import { chapterNumbers, chooseVersion, type PickerState, readHref } from "@/lib/bible/picker";
import { VERSIONS } from "@/lib/bible/versions";

const label = "mb-2 font-ui text-xs font-semibold uppercase tracking-[.1em] text-muted";

const GROUPS = [
  { testament: "old", title: "Old Testament" },
  { testament: "new", title: "New Testament" },
] as const;

/**
 * The permanent picker beside the text from lg: Bible, books, chapters and verses. Books and
 * chapters are plain links, so they work without JavaScript; the Bible and the verses need it.
 */
export function PassageColumn({ state }: { state: PickerState }) {
  const router = useRouter();
  const book = findBook(state.book)!;
  const [verses, setVerses] = useState(state);

  return (
    <aside
      aria-label="Choose passage"
      className="hidden max-h-[calc(100dvh-7rem)] gap-6 overflow-y-auto pb-6 pr-2 lg:sticky lg:top-24 lg:grid lg:content-start"
    >
      <div>
        <p className={label}>Bible</p>
        <div
          role="radiogroup"
          aria-label="Bible version"
          className="flex overflow-hidden rounded-sm border-[1.5px] border-line bg-bg"
        >
          {VERSIONS.map((version) => (
            <label
              key={version.id}
              className="flex min-h-11 flex-1 cursor-pointer items-center justify-center font-ui text-[14px] font-bold text-ink has-[:checked]:bg-accent-ink has-[:checked]:text-bg has-[:disabled]:cursor-not-allowed has-[:disabled]:text-muted has-[:disabled]:opacity-70 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-4 has-[:focus-visible]:outline-accent"
            >
              <input
                type="radio"
                name="column-version"
                value={version.id}
                checked={state.version === version.id}
                disabled={!version.enabled}
                onChange={() => router.push(readHref(chooseVersion(state, version.id)))}
                className="sr-only"
              />
              {version.enabled ? version.short : `${version.short} soon`}
            </label>
          ))}
        </div>
      </div>

      <nav aria-label="Books">
        <div data-scroll className="max-h-[36dvh] min-h-40 overflow-y-auto pr-1">
          {GROUPS.map(({ testament, title }) => (
            <div key={testament} className="mb-3">
              <p className={label}>{title}</p>
              <div className="grid">
                {BOOKS.filter((b) => b.testament === testament).map((b) => (
                  <Link
                    key={b.slug}
                    href={`/bible/${state.version}/${b.slug}/1`}
                    ref={b.slug === state.book ? scrollToCurrent : undefined}
                    aria-current={b.slug === state.book ? "true" : undefined}
                    className="flex min-h-11 items-center border-b border-line px-1 font-ui text-[16px] font-semibold text-ink hover:text-accent-ink aria-[current=true]:border-l-4 aria-[current=true]:border-l-accent aria-[current=true]:bg-surface aria-[current=true]:pl-3"
                  >
                    {b.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <nav aria-label={`Chapters of ${book.name}`}>
        <p className={label}>Chapter</p>
        <div
          data-scroll
          className="grid max-h-[20dvh] min-h-24 grid-cols-6 gap-1.5 overflow-y-auto pr-1"
        >
          {chapterNumbers(book).map((chapter) => (
            <Link
              key={chapter}
              href={`/bible/${state.version}/${book.slug}/${chapter}`}
              ref={chapter === state.chapter ? scrollToCurrent : undefined}
              aria-current={chapter === state.chapter ? "true" : undefined}
              className="flex min-h-11 items-center justify-center rounded-sm border-[1.5px] border-line bg-surface font-ui text-[15px] font-semibold text-ink hover:border-accent aria-[current=true]:border-accent-ink aria-[current=true]:bg-accent-ink aria-[current=true]:text-bg"
            >
              {chapter}
            </Link>
          ))}
        </div>
      </nav>

      <details open={state.from !== null} className="grid">
        <summary className="flex min-h-11 cursor-pointer items-center font-ui text-xs font-semibold uppercase tracking-[.1em] text-muted">
          Verses
        </summary>
        <div className="grid gap-3 pt-2">
          <PickVerses book={book} state={verses} onChange={setVerses} />
          <button
            type="button"
            onClick={() => router.push(readHref(verses))}
            className={buttonClasses("primary")}
          >
            Show verses
          </button>
        </div>
      </details>
    </aside>
  );
}
