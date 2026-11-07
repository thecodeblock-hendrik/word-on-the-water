/** A scripture reference kept as data so the translation or format can change later. */
export type Scripture = {
  book: string;
  chapter: number;
  /** A verse or range such as "41" or "3–4". Omit for a whole chapter. */
  verses?: string;
};

export const TRANSLATION = "ESV";

export const ESV_NOTICE =
  "Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved. The ESV text may not be quoted in any publication made available to the public by a Creative Commons license. The ESV may not be translated into any other language.";

export const ESV_LIMITS =
  "Users may not copy or download more than 500 verses of the ESV Bible or more than one half of any book of the ESV Bible.";

export const ESV_URL = "https://www.esv.org";

export function formatReference({ book, chapter, verses }: Scripture): string {
  return verses ? `${book} ${chapter}:${verses}` : `${book} ${chapter}`;
}
