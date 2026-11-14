import { ESV_NOTICE } from "../scripture.ts";
import { goDeeperItems, INLINE_MARKS, splitAmen, splitBlocks } from "./blocks.ts";
import type { Devotional } from "./parse.ts";

/** Colours of the light scheme (tokens.css) as hex, because email has no CSS variables. */
const ACCENT = "#d9703a";
const ACCENT_INK = "#a9501f";
const MUTED = "#5c5e70";

// Kit's "Text only" template drops blockquote styling, so quotes carry their own.
const PULL_QUOTE = `margin:0 0 16px;padding-left:16px;border-left:3px solid ${ACCENT};font-style:italic`;
const SCRIPTURE = `margin:0 0 16px;padding:12px 16px;border-left:3px solid ${ACCENT};background:#fffaf3;font-style:italic`;
const CITE = `font-size:13px;letter-spacing:.1em;text-transform:uppercase;font-style:normal;color:${MUTED}`;
const AMEN = `font-weight:600;letter-spacing:.2em;text-transform:uppercase;font-style:normal;color:${ACCENT_INK}`;
const SMALL_PRINT = `font-size:12px;color:${MUTED}`;

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escape = (text: string) => text.replace(/[&<>"]/g, (c) => ESCAPES[c]);

/** Devotional text as email-safe HTML: marks become tags, everything else is escaped. */
function inline(text: string): string {
  return text
    .split(INLINE_MARKS)
    .map((part) => {
      if (part.startsWith("**")) return `<strong>${escape(part.slice(2, -2))}</strong>`;
      if (part.startsWith("*")) return `<em>${escape(part.slice(1, -1))}</em>`;
      if (part.startsWith("^")) return `<sup>${part.slice(1, -1)}</sup>`;
      if (part === "LORD") return '<span style="font-variant:small-caps">Lord</span>';
      return escape(part);
    })
    .join("");
}

function prose(markdown: string): string[] {
  return splitBlocks(markdown).map(({ kind, text }) =>
    kind === "quote"
      ? `<blockquote style="${PULL_QUOTE}">${inline(text)}</blockquote>`
      : `<p>${inline(text)}</p>`,
  );
}

function conditions({ meta }: Devotional): string[] {
  const verses = meta.conditions.map(
    ({ text, ref }) =>
      `<blockquote style="${SCRIPTURE}">${inline(text)}<br><cite style="${CITE}">${escape(ref)}</cite></blockquote>`,
  );
  return ["<h2>Conditions</h2>", ...verses];
}

function prayer(markdown: string): string[] {
  const { body, amen } = splitAmen(markdown);
  const closing = amen ? ` <span style="${AMEN}">${amen}</span>` : "";
  return ["<h2>Pray</h2>", `<p><em>${inline(body)}</em>${closing}</p>`];
}

function goDeeper(markdown: string): string[] {
  const items = goDeeperItems(markdown).map(
    ({ term, text }) => `<p><strong>${escape(term)}</strong><br>${inline(text)}</p>`,
  );
  return ["<h2>Go Deeper</h2>", ...items];
}

/**
 * The email body for a devotional, as a fragment (Kit wraps it in the page). Kit adds the
 * unsubscribe link and postal address itself (2.4 spike, ADR 0008), so they are not written here.
 */
export function devotionalEmailHtml(
  devotional: Devotional,
  { siteUrl }: { siteUrl: string },
): string {
  const text = (name: string) => devotional.sections.find((s) => s.heading === name)?.markdown;
  const section = (name: string) => [`<h2>${name}</h2>`, ...prose(text(name)!)];
  const deeper = text("Go Deeper");
  const link = `${siteUrl.replace(/\/$/, "")}/devotionals/${devotional.slug}`;

  return [
    `<h1>${escape(devotional.meta.title)}</h1>`,
    ...conditions(devotional),
    ...section("The Lineup"),
    ...section("The Word"),
    ...section("Paddle Out"),
    ...prayer(text("Pray")!),
    ...(deeper ? goDeeper(deeper) : []),
    `<p><a href="${link}">Read it on the website</a></p>`,
    `<p style="${SMALL_PRINT}">${escape(ESV_NOTICE)}</p>`,
  ].join("\n");
}
