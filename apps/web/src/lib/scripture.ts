/** A scripture reference kept as data so the translation or format can change later. */
export type Scripture = {
  book: string;
  chapter: number;
  /** A verse or range such as "41" or "3–4". Omit for a whole chapter. */
  verses?: string;
};

export const TRANSLATION = "ESV";

export const ESV_NOTICE =
  "Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.";

export function formatReference({ book, chapter, verses }: Scripture): string {
  return verses ? `${book} ${chapter}:${verses}` : `${book} ${chapter}`;
}
