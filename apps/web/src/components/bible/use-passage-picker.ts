import { useState } from "react";

import { findBook } from "@/lib/bible/books";
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

/**
 * The choices of a passage picker, shared by the desktop popover and the phone sheet. Nothing is
 * applied until the address is used; reset() drops unfinished choices each time the picker opens.
 */
export function usePassagePicker(current: PickerState) {
  const [state, setState] = useState(current);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<number | null>(null);

  const book = findBook(state.book)!;
  const pages = chapterPages(book);
  const range =
    state.from === null || state.to === null ? null : { from: state.from, to: state.to };

  const update = (next: PickerState) => {
    setState(next);
    setAnchor(null);
  };

  return {
    state,
    book,
    anchor,
    query,
    setQuery,
    setPage,
    pages,
    pageIndex: page ?? Math.floor((state.chapter - 1) / 25),
    lastVerse: lastVerseOf(state.version, book, state.chapter),
    title: passageTitle(book, state.chapter, range),
    href: readHref(state),
    reset() {
      setState(current);
      setAnchor(null);
      setQuery("");
      setPage(null);
    },
    chooseVersion: (id: string) => setState(chooseVersion(state, id)),
    chooseBook(slug: string) {
      update(chooseBook(state, slug));
      setPage(null);
    },
    chooseChapter: (chapter: number) => update(chooseChapter(state, chapter)),
    clickVerse(verse: number) {
      const next = pickVerse(state, anchor, verse);
      setState(next.state);
      setAnchor(next.anchor);
    },
    wholeChapter: () => update(chooseVerses(state, null, null)),
  };
}
