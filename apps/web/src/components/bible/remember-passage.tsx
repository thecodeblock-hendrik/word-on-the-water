"use client";

import { useEffect } from "react";

import { type Passage, parsePassage, passageCookie, passageValue } from "@/lib/bible/remember";

/**
 * Remembers the passage being read, so /bible resumes there next time. A preference cookie set in
 * the browser, so no request is made. Does nothing for a passage that does not exist.
 */
export function RememberPassage({ book, chapter, from, to }: Passage) {
  useEffect(() => {
    const passage = { book, chapter, from, to };
    const value = passageValue(passage);
    if (passageValue(parsePassage(value)) === value)
      document.cookie = passageCookie(passage, location.protocol === "https:");
  }, [book, chapter, from, to]);
  return null;
}
